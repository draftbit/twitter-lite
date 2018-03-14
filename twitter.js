const crypto = require("crypto");
const OAuth = require("oauth-1.0a");
const Fetch = require("cross-fetch");
const querystring = require("querystring");
const Stream = require("./stream");

const getUrl = subdomain => `https://${subdomain}.twitter.com/1.1`;
const getOauth = subdomain => `https://${subdomain}.twitter.com/oauth`;

const createOauthClient = ({ key, secret }) => {
  const client = OAuth({
    consumer: { key, secret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto
        .createHmac("sha1", key)
        .update(baseString)
        .digest("base64");
    }
  });

  return client;
};

const defaults = {
  subdomain: "api",
  consumer_key: null,
  consumer_secret: null,
  access_token_key: null,
  access_token_secret: null,
  bearer_token: null
};

const baseHeaders = {
  "Content-Type": "application/json",
  Accept: "application/json"
};

function formatRes(txt){
  var ts = txt.split("&");
  var obj = {};
  for(var i=0; i<ts.length; i++){
    var ts2 = ts[i].split("=");
    obj[ts2[0]] = ts2[1];
  }

  return obj;
}

class Twitter {
  constructor(options) {
    const config = Object.assign({}, defaults, options);
    this.authType = config.bearer_token ? "App" : "User";
    this.client = createOauthClient({
      key: config.consumer_key,
      secret: config.consumer_secret
    });

    this.token = {
      key: config.access_token_key,
      secret: config.access_token_secret
    };

    this.url = getUrl(config.subdomain);
    this.oauth = getOauth(config.subdomain);
    this.config = config;
  }
  
  async reqTkn(callback) {
    // return `oauth_token` & `oauth_token_secret`
    // https://developer.twitter.com/en/docs/basics/authentication/api-reference/request_token
    
    const requestData = {
      url: `${this.oauth}/request_token`,
      method: "POST"
    };
    
    var parameters = {};
    if(callback) parameters = { "oauth_callback": callback };
    if (parameters) requestData.url += "?" + querystring.stringify(parameters);

    let headers = {};
    headers = this.client.toHeader(
      this.client.authorize(requestData, {})
    );

    const results = await Fetch(requestData.url, {
      method: "POST",
      headers: Object.assign({}, baseHeaders, headers)
    })
    .then(res => res.text())
    .then(txt => formatRes(txt));
    
    return results;
  }
  
  async accTkn(key, secret, verifier) {
    // return `accTkn_key` & `accTkn_secret`
    // https://developer.twitter.com/en/docs/basics/authentication/api-reference/access_token
    
    const requestData = {
      url: `${this.oauth}/access_token`,
      method: "POST"
    };
    
    var parameters = { "oauth_verifier": verifier };
    if (parameters) requestData.url += "?" + querystring.stringify(parameters);

    let headers = {};
    headers = this.client.toHeader(
      this.client.authorize(requestData, {
        key: key,
        secret: secret
      })
    );

    const results = await Fetch(requestData.url, {
      method: "POST",
      headers: Object.assign({}, baseHeaders, headers)
    })
    .then(res => res.text())
    .then(txt => formatRes(txt));
    
    return results;
  }
  
  async get(resource, parameters) {
    const requestData = {
      url: `${this.url}/${resource}.json`,
      method: "GET"
    };
    if (parameters) requestData.url += "?" + querystring.stringify(parameters);

    let headers = {};
    if (this.authType === "User") {
      headers = this.client.toHeader(
        this.client.authorize(requestData, this.token)
      );
    } else {
      headers = {
        Authorization: `Bearer ${this.config.bearer_token}`
      };
    }

    const results = await Fetch(requestData.url, { headers }).then(res =>
      res.json()
    );
    return results;
  }
  
  async post(resource, body, parameters) {
    const requestData = {
      url: `${this.url}/${resource}.json`,
      method: "POST"
    };

    if (parameters) requestData.url += "?" + querystring.stringify(parameters);

    let headers = {};
    if (this.authType === "User") {
      headers = this.client.toHeader(
        this.client.authorize(requestData, this.token)
      );
    } else {
      headers = {
        Authorization: `Bearer ${this.config.bearer_token}`
      };
    }

    const results = await Fetch(requestData.url, {
      method: "POST",
      headers: Object.assign({}, baseHeaders, headers),
      body: JSON.stringify(body)
    }).then(res => res.json());
    return results;
  }

  stream(resource, parameters) {
    if (this.authType !== "User")
      throw Error("Streams require user context authentication");

    const stream = new Stream();

    const requestData = {
      url: `${getUrl("stream")}/${resource}.json`,
      method: "GET"
    };
    if (parameters) requestData.url += "?" + querystring.stringify(parameters);

    const headers = this.client.toHeader(
      this.client.authorize(requestData, this.token)
    );

    const request = Fetch(requestData.url, { headers });

    request
      .then(response => {
        this.stream.destroy = () => response.body.destroy();

        response.status === 200
          ? stream.emit("start", response)
          : stream.emit("error", Error(`Status Code: ${response.status}`));

        response.body
          .on("data", chunk => stream.parse(chunk))
          .on("error", error => stream.emit("error", error))
          .on("end", () => stream.emit("end", response));
      })
      .catch(error => stream.emit("error", error));

    return stream;
  }
}

module.exports = Twitter;

