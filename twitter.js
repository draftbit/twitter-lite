const crypto = require("crypto");
const OAuth = require("oauth-1.0a");
const SubIn = require("sub-in");
const Fetch = require("node-fetch");

const getUrl = subdomain => SubIn("https://$0.twitter.com/1.1", [subdomain]);
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
  access_token_secret: null
};

class Twitter {
  constructor(options) {
    const config = Object.assign({}, defaults, options);
    this.client = createOauthClient({
      key: config.consumer_key,
      secret: config.consumer_secret
    });

    this.token = {
      key: config.access_token_key,
      secret: config.access_token_secret
    };

    this.url = getUrl(config.subdomain);
  }

  async get(resource) {
    const requestData = {
      url: `${this.url}/${resource}.json`,
      method: "GET"
    };

    const headers = this.client.toHeader(
      this.client.authorize(requestData, this.token)
    );

    const results = await Fetch(requestData.url, { headers }).then(res =>
      res.json()
    );
    return results;
  }

  async post(resource, body) {
    const requestData = {
      url: `${this.url}/${resource}.json`,
      method: "POST"
    };
    const headers = this.client.toHeader(
      this.client.authorize(requestData, this.token)
    );

    const results = await Fetch(requestData.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers
      },
      body: JSON.stringify(body)
    }).then(res => res.json());
    return results;
  }
}

module.exports = Twitter;
