const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const Fetch = require('cross-fetch');
const querystring = require('querystring');
const Stream = require('./stream');

const getUrl = (subdomain, endpoint = '1.1') =>
  `https://${subdomain}.twitter.com/${endpoint}`;

const getLabsUrl = (version, endpoint) =>
  `https://api.twitter.com/labs/${version}/tweets/${endpoint}`;

const createOauthClient = ({ key, secret }) => {
  const client = OAuth({
    consumer: { key, secret },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return crypto
        .createHmac('sha1', key)
        .update(baseString)
        .digest('base64');
    },
  });

  return client;
};

const defaults = {
  subdomain: 'api',
  consumer_key: null,
  consumer_secret: null,
  access_token_key: null,
  access_token_secret: null,
  bearer_token: null,
  version: '1.1',
};

// Twitter expects POST body parameters to be URL-encoded: https://developer.twitter.com/en/docs/basics/authentication/guides/creating-a-signature
// However, some endpoints expect a JSON payload - https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/new-event
// It appears that JSON payloads don't need to be included in the signature,
// because sending DMs works without signing the POST body
const JSON_ENDPOINTS = [
  'direct_messages/events/new',
  'direct_messages/welcome_messages/new',
  'direct_messages/welcome_messages/rules/new',
  'media/metadata/create',
  'collections/entries/curate',
];

const baseHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

function percentEncode(string) {
  // From OAuth.prototype.percentEncode
  return string
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

class Twitter {
  constructor(options) {
    const config = Object.assign({}, defaults, options);
    this.authType = config.bearer_token ? 'App' : 'User';
    this.client = createOauthClient({
      key: config.consumer_key,
      secret: config.consumer_secret,
    });

    this.token = {
      key: config.access_token_key,
      secret: config.access_token_secret,
    };

    this.url = getUrl(config.subdomain, config.version);
    this.oauth = getUrl(config.subdomain, 'oauth');
    this.config = config;
  }

  /**
   * Parse the JSON from a Response object and add the Headers under `_headers`
   * @param {Response} response - the Response object returned by Fetch
   * @return {Promise<object>}
   * @private
   */
  static async _handleResponse(response) {
    const headers = response.headers; // TODO: see #44
    if (response.ok) {
      // Return empty response on 204 "No content", or Content-Length=0
      if (response.status === 204 || response.headers.get('content-length') === '0')
        return {
          _headers: headers,
        };
      // Otherwise, parse JSON response
      return response.json().then(res => {
        res._headers = headers; // TODO: this creates an array-like object when it adds _headers to an array response
        return res;
      });
    } else {
      throw {
        _headers: headers,
        ...await response.json(),
      };
    }
  }

  /**
   * Resolve the TEXT parsed from the successful response or reject the JSON from the error
   * @param {Response} response - the Response object returned by Fetch
   * @return {Promise<object>}
   * @throws {Promise<object>}
   * @private
   */
  static async _handleResponseTextOrJson(response) {
    let body = await response.text();
    if (response.ok) {
      return querystring.parse(body);
    } else {
      let error;
      try {
        // convert to object if it is a json
        error = JSON.parse(body);
      } catch (e) {
        // it is not a json
        error = body;
      }
      return Promise.reject(error);
    }
  }

  async getBearerToken() {
    const headers = {
      Authorization:
        'Basic ' +
        Buffer.from(
          this.config.consumer_key + ':' + this.config.consumer_secret,
        ).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    };

    const results = await Fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers,
    }).then(Twitter._handleResponse);

    return results;
  }

  async getRequestToken(twitterCallbackUrl) {
    const requestData = {
      url: `${this.oauth}/request_token`,
      method: 'POST',
    };

    let parameters = {};
    if (twitterCallbackUrl) parameters = { oauth_callback: twitterCallbackUrl };
    if (parameters) requestData.url += '?' + querystring.stringify(parameters);

    const headers = this.client.toHeader(
      this.client.authorize(requestData, {}),
    );

    const results = await Fetch(requestData.url, {
      method: 'POST',
      headers: Object.assign({}, baseHeaders, headers),
    })
      .then(Twitter._handleResponseTextOrJson);

    return results;
  }

  async getAccessToken(options) {
    const requestData = {
      url: `${this.oauth}/access_token`,
      method: 'POST',
    };

    let parameters = { oauth_verifier: options.oauth_verifier, oauth_token: options.oauth_token };
    if (parameters.oauth_verifier && parameters.oauth_token) requestData.url += '?' + querystring.stringify(parameters);

    const headers = this.client.toHeader(this.client.authorize(requestData));

    const results = await Fetch(requestData.url, {
      method: 'POST',
      headers: Object.assign({}, baseHeaders, headers),
    })
      .then(Twitter._handleResponseTextOrJson);

    return results;
  }

  _makeAuthorizationHeader(requestData) {
    if (this.authType === 'User') {
      return this.client.toHeader(
        this.client.authorize(requestData, this.token),
      );
    } else {
      return {
        Authorization: `Bearer ${this.config.bearer_token}`,
      };
    }
  }

  /**
   * Construct the data and headers for an authenticated HTTP request to the Twitter API
   * @param {string} method - 'GET' or 'POST'
   * @param {string} resource - the API endpoint
   * @param {object} parameters
   * @return {{requestData: {url: string, method: string}, headers: ({Authorization: string}|OAuth.Header)}}
   * @private
   */
  _makeRequest(method, resource, parameters) {
    const requestData = {
      url: `${this.url}/${resource}.json`,
      method,
    };
    if (parameters)
      if (method === 'POST') requestData.data = parameters;
      else requestData.url += '?' + querystring.stringify(parameters);

    let headers = this._makeAuthorizationHeader(requestData);
    return {
      requestData,
      headers,
    };
  }

  /**
   * Send a GET request
   * @param {string} resource - endpoint, e.g. `followers/ids`
   * @param {object} [parameters] - optional parameters
   * @returns {Promise<object>} Promise resolving to the response from the Twitter API.
   *   The `_header` property will be set to the Response headers (useful for checking rate limits)
   */
  get(resource, parameters) {
    const { requestData, headers } = this._makeRequest(
      'GET',
      resource,
      parameters,
    );

    return Fetch(requestData.url, { headers })
      .then(Twitter._handleResponse);
  }

  /**
   * Send a POST request
   * @param {string} resource - endpoint, e.g. `users/lookup`
   * @param {object} body - POST parameters object.
   *   Will be encoded appropriately (JSON or urlencoded) based on the resource
   * @returns {Promise<object>} Promise resolving to the response from the Twitter API.
   *   The `_header` property will be set to the Response headers (useful for checking rate limits)
   */
  post(resource, body) {
    const { requestData, headers } = this._makeRequest(
      'POST',
      resource,
      JSON_ENDPOINTS.includes(resource) ? null : body, // don't sign JSON bodies; only parameters
    );

    const postHeaders = Object.assign({}, baseHeaders, headers);
    if (JSON_ENDPOINTS.includes(resource)) {
      body = JSON.stringify(body);
    } else {
      body = percentEncode(querystring.stringify(body));
      postHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    return Fetch(requestData.url, {
      method: 'POST',
      headers: postHeaders,
      body,
    })
      .then(Twitter._handleResponse);
  }

  /**
   * Send a PUT request 
   * @param {string} resource - endpoint e.g. `direct_messages/welcome_messages/update`
   * @param {object} parameters - required or optional query parameters
   * @param {object} body - PUT request body 
   * @returns {Promise<object>} Promise resolving to the response from the Twitter API.
   */
  put(resource, parameters, body) {
    const { requestData, headers } = this._makeRequest(
      'PUT',
      resource,
      parameters,
    );

    const putHeaders = Object.assign({}, baseHeaders, headers);
    body = JSON.stringify(body);

    return Fetch(requestData.url, {
      method: 'PUT',
      headers: putHeaders,
      body,
    })
      .then(Twitter._handleResponse);
  }

  /**
   *
   * @param {string} resource - endpoint, e.g. `statuses/filter`
   * @param {object} parameters
   * @returns {Stream}
   */
  stream(resource, parameters) {
    if (this.authType !== 'User')
      throw new Error('Streams require user context authentication');

    const stream = new Stream();

    // POST the request, in order to accommodate long parameter lists, e.g.
    // up to 5000 ids for statuses/filter - https://developer.twitter.com/en/docs/tweets/filter-realtime/api-reference/post-statuses-filter
    const requestData = {
      url: `${getUrl('stream')}/${resource}.json`,
      method: 'POST',
    };
    if (parameters) requestData.data = parameters;

    const headers = this.client.toHeader(
      this.client.authorize(requestData, this.token),
    );

    const request = Fetch(requestData.url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: percentEncode(querystring.stringify(parameters)),
    });

    request
      .then(response => {
        stream.destroy = this.stream.destroy = () => response.body.destroy();

        if (response.ok) {
          stream.emit('start', response);
        } else {
          response._headers = response.headers;  // TODO: see #44 - could omit the line
          stream.emit('error', response);
        }

        response.body
          .on('data', chunk => stream.parse(chunk))
          .on('error', error => stream.emit('error', error))  // no point in adding the original response headers
          .on('end', () => stream.emit('end', response));
      })
      .catch(error => stream.emit('error', error));

    return stream;
  }

  withLabs() {
    return new TwitterLabs(this);
  }

  /**
   * Create a simple rule structure, useful when twitter labs filter stream rules
   * 
   * @param {string} value the rule value
   * @param {string} [tag] tag associated with rule
   * @returns {{value: string, tag?: string}} object that can be used to add rules
   */
  static labsFilterStreamRule(value, tag) {
    if (tag) return { value, tag };
    else return { value };
  }
}

/**
 * Rule structure when adding twitter labs filter stream rules
 * @typedef {{value: string, tag?: string}} LabsFilterStreamRule
 */

/**
 * Twitter labs expansions
 * @typedef {'attachment.poll_ids'|'attachments.media_keys'|'author_id'|'entities.mentions.username'|
 * 'geo.place_id'|'in_reply_to_user_id'|'referenced_tweets.id'|'referenced_tweets.id.author_id'} LabsExpansion
 * @see {@link https://developer.twitter.com/en/docs/labs/overview/whats-new/expansions About expansions}
 */

/**
 * Twitter labs response format
 * @typedef {'compact'|'detailed'|'default'} LabsFormat
 * @see {@link https://developer.twitter.com/en/docs/labs/overview/whats-new/formats About format}
 */

/**
 * Twitter class that enhances its functionalities with Twitter Labs API calls
 * @augments {Twitter}
 */
class TwitterLabs extends Twitter {
  /**
   * Class that also enables requests to Twitter Labs APIs using the given original {@link Twitter} instances
   * 
   * @constructor
   * @param {Twitter} originalTwitter original twitter instance
   */
  constructor(originalTwitter) {
    super();
    // copy properties for ease
    Object.defineProperties(this, Object.getOwnPropertyDescriptors(originalTwitter));
  }

  _makeLabsRequest(method, version, resource, queryParams) {
    const requestData = {
      url: `${getLabsUrl(version, resource)}`,
      method,
    };
    if (queryParams) requestData.url += '?' + querystring.stringify(queryParams);

    let headers = this._makeAuthorizationHeader(requestData);
    return {
      requestData,
      headers,
    };
  }

  /**
   * Add rule for the filter stream API
   * 
   * @param {LabsFilterStreamRule[]} rules a list of rules for the filter stream API 
   * @param {boolean} [dryRun] optional parameter to mark the request as a dry run 
   * @returns {Promise<object>} Promise response from Twitter API
   * @see {@link https://developer.twitter.com/en/docs/labs/filtered-stream/api-reference/post-tweets-stream-filter-rules Twitter API}
   */
  addRules(rules, dryRun) {
    let queryParams = {};
    if (dryRun) queryParams = { dry_run: true };
    const { requestData, headers } = this._makeLabsRequest('POST', '1', 'stream/filter/rules', queryParams);
    const postHeaders = Object.assign({}, baseHeaders, headers);
    return Fetch(requestData.url, {
      method: requestData.method,
      headers: postHeaders,
      body: JSON.stringify({ add: rules }),
    }).then(Twitter._handleResponse);
  }

  /**
   * Get registered rules
   *
   * @returns {Promise<object>} Promise response from Twitter API
   * @see {@link https://developer.twitter.com/en/docs/labs/filtered-stream/api-reference/get-tweets-stream-filter-rules Twitter API}
   */
  getRules(...ids) {
    let queryParams = {};
    if (ids) queryParams = { ids: ids.join(',') };
    const { requestData, headers } = this._makeLabsRequest('GET', '1', 'stream/filter/rules', queryParams);
    return Fetch(requestData.url, {
      method: requestData.method,
      headers,
    }).then(Twitter._handleResponse);
  }

  /**
   * Delete registered rules
   * 
   * @param {string[]} Rule IDs that has been registered 
   * @param {boolean} [dryRun] optional parameter to mark request as a dry run 
   * @returns {Promise<object>} Promise response from Twitter API
   * @see {@link https://developer.twitter.com/en/docs/labs/filtered-stream/api-reference/get-tweets-stream-filter-rules Twitter API}
   */
  deleteRules(ids, dryRun) {
    let queryParams = {};
    if (dryRun) queryParams = { dry_run: dryRun };
    const { requestData, headers } = this._makeLabsRequest('POST', '1', 'stream/filter/rules', queryParams);
    const postHeaders = Object.assign({}, baseHeaders, headers);
    return Fetch(requestData.url, {
      method: requestData.method,
      headers: postHeaders,
      body: JSON.stringify({ delete: { ids } }),
    }).then(Twitter._handleResponse);
  }

  /**
   * Start filter stream using saved rules
   *  
   * @param {{expansions: LabsExpansion[], format: LabsFormat, 'place.format': LabsFormat,
   *  'tweet.format': LabsFormat, 'user.format': LabsFormat}} [queryParams]
   * @returns {Stream} stream object for the filter stream
   * @see {@link https://developer.twitter.com/en/docs/labs/filtered-stream/api-reference/get-tweets-stream-filter Twitter API}
   */
  filterStream(queryParams) {
    if (queryParams && queryParams.expansions) {
      queryParams.expansions = queryParams.expansions.join(',');
    }
    const { requestData, headers } = this._makeLabsRequest('GET', '1', 'stream/filter', queryParams);
    console.log(requestData.url);

    const stream = new Stream();
    const request = Fetch(requestData.url, {
      method: requestData.method,
      headers,
    });

    request
      .then(response => {
        stream.destroy = this.stream.destroy = () => response.body.destroy();

        if (response.ok) {
          stream.emit('start', response);
        } else {
          response._headers = response.headers;
          stream.emit('error', response);
        }

        response.body
          .on('data', chunk => stream.parse(chunk))
          .on('error', error => stream.emit('error', error))
          .on('end', () => stream.emit('end', response));
      })
      .catch(error => stream.emit('error', error));

    return stream;
  }

}

module.exports = Twitter;
