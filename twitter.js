const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const Fetch = require('cross-fetch');
const querystring = require('querystring');
const Stream = require('./stream');

const getUrl = (subdomain, endpoint = '1.1') =>
  `https://${subdomain}.twitter.com/${endpoint}`;

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
};

// Twitter expects POST body parameters to be URL-encoded: https://developer.twitter.com/en/docs/basics/authentication/guides/creating-a-signature
// However, some endpoints expect a JSON payload - https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/new-event
// It appears that JSON payloads don't need to be included in the signature,
// because sending DMs works without signing the POST body
const JSON_ENDPOINTS = [
  'direct_messages/events/new',
  'direct_messages/welcome_messages/new',
  'direct_messages/welcome_messages/rules/new',
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

    this.url = getUrl(config.subdomain);
    this.oauth = getUrl(config.subdomain, 'oauth');
    this.config = config;
  }

  /**
   * Parse the JSON from a Response object and add the Headers under `_headers`
   * @param {Response} response - the Response object returned by Fetch
   * @return {Promise<object>}
   * @private
   */
  static _handleResponse(response) {
    const headers = response.headers.raw(); // TODO: see #44
    // Return empty response on 204 "No content"
    if (response.status === 204)
      return {
        _headers: headers,
      };
    // Otherwise, parse JSON response
    return response.json().then(res => {
      res._headers = headers; // TODO: this creates an array-like object when it adds _headers to an array response
      return res;
    });
  }

  async getBearerToken() {
    const headers = {
      Authorization:
        'Basic ' +
        Buffer.from(
          this.config.consumer_key + ':' + this.config.consumer_secret
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
      this.client.authorize(requestData, {})
    );

    const results = await Fetch(requestData.url, {
      method: 'POST',
      headers: Object.assign({}, baseHeaders, headers),
    })
      .then(res => res.text())
      .then(txt => querystring.parse(txt));

    return results;
  }

  async getAccessToken(options) {
    const requestData = {
      url: `${this.oauth}/access_token`,
      method: 'POST',
    };

    let parameters = { oauth_verifier: options.verifier };
    if (parameters) requestData.url += '?' + querystring.stringify(parameters);

    const headers = this.client.toHeader(
      this.client.authorize(requestData, {
        key: options.key,
        secret: options.secret,
      })
    );

    const results = await Fetch(requestData.url, {
      method: 'POST',
      headers: Object.assign({}, baseHeaders, headers),
    })
      .then(res => res.text())
      .then(txt => querystring.parse(txt));

    return results;
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

    let headers = {};
    if (this.authType === 'User') {
      headers = this.client.toHeader(
        this.client.authorize(requestData, this.token)
      );
    } else {
      headers = {
        Authorization: `Bearer ${this.config.bearer_token}`,
      };
    }
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
      parameters
    );

    return Fetch(requestData.url, { headers })
      .then(Twitter._handleResponse)
      .then(results =>
        'errors' in results ? Promise.reject(results) : results
      );
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
      JSON_ENDPOINTS.includes(resource) ? null : body // don't sign JSON bodies; only parameters
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
      .then(Twitter._handleResponse)
      .then(results =>
        'errors' in results ? Promise.reject(results) : results
      );
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
      this.client.authorize(requestData, this.token)
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
          response._headers = response.headers.raw();  // TODO: see #44 - could omit the line
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
}

module.exports = Twitter;
