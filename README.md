# Twitter Lite

A tiny Nodejs library for the Twitter API

[![npm](https://img.shields.io/npm/v/twitter-lite.svg)](https://npm.im/twitter-lite) [![travis](https://travis-ci.org/Preposterous/twitter-lite.svg?branch=master)](https://travis-ci.org/Preposterous/twitter-lite)

## Features

* Promise driven via Async / Await
* Up-to-date APIs
* Stream support
* Under 1kb

## Installation

```zsh
yarn add twitter-lite
```

```zsh
npm install twitter-lite
```

## Usage

* Create an app on [https://apps.twitter.com/](https://apps.twitter.com)
* Grab the Consumer Key (API Key) and Consumer Secret (API Secret) from Keys and Access Tokens
* Make sure you set the right access level for your app

### App vs. User

Twitter has two different authentication options:

* App: higher rate limits. Great for building your own Twitter App
* User: lower rate limits. Great for making requests on behalf of a User.

**User** authentication requires:

* `consumer_key`
* `consumer_secret`
* `access_token_key`
* `access_token_secret`

**App** authentication requires:

* `bearer_token`

App authentication is a simple header behind the scenes:

```es6
headers: {
  Authorization: `Bearer ${bearer_token}`;
}
```

### Oauth Authentication
According to the [docs](https://developer.twitter.com/en/docs/basics/authentication/api-reference/authenticate) this helps you get access token from your users.

```es6
const client = new Twitter({
  consumer_key: "xyz",
  consumer_secret: "xyz"
});

client.getRequestToken("http://callbackurl.com")
.then(res => console.log(res))
.catch(console.error);
```

Then you redirect your user to `https://api.twitter.com/oauth/authenticate?oauth_token=xyz123abc`, and once you get the verifier and the token, you pass them on to the next stage of the authentication.

```es6
const client = new Twitter({
  consumer_key: "xyz",
  consumer_secret: "xyz"
});

client.getAccessToken({
    key: requestToken,
    secret: requestTokenSecret,
    verifier: oauthVerifier
})
.then(res=>console.log(res))
.catch(console.error);
```

And this will return you your `access_token` and `access_token_secret`.

### Verifying Credentials Example (User auth)

```es6
const client = new Twitter({
  subdomain: "api",
  consumer_key: "xyz", // from Twitter.
  consumer_secret: "xyz", // from Twitter.
  access_token_key: "abc", // from your User (oauth_token)
  access_token_secret: "abc" // from your User (oauth_token_secret)
});

client
  .get("account/verify_credentials")
  .then(results => {
    console.log("results", results);
  })
  .catch(console.error);
```

### App authentication Example

```es6
const client = new Twitter({
  subdomain: "api",
  bearer_token: "Bearer ABC123XYZ" // generate a Bearer token
});

client
  .get("users/lookup")
  .then(results => {
    console.log("results", results);
  })
  .catch(console.error);
```

## Streams

To learn more about the streaming API visit the [Twitter Docs](https://developer.twitter.com/en/docs/tweets/filter-realtime/api-reference/post-statuses-filter.html).

```es6
const client = new Twitter({
  consumer_key: "xyz" // from Twitter.
  consumer_secret: "xyz" // from Twitter.
  access_token_key: "abc" // from your User (oauth_token)
  access_token_secret: "abc" // from your User (oauth_token_secret)
});

const parameters = {
  track: "#bitcoin,#litecoin,#monero", // #bitcoin, #litecoin, #monero
  follow: "422297024,873788249839370240", // @OrchardAI, @tylerbuchea
  locations: "-122.75,36.8,-121.75,37.8", // Bounding box -	San Francisco
};

client.stream("statuses/filter", parameters)
  .on("start", response => console.log("start"))
  .on("data", data => console.log("data", data.text))
  .on("ping", () => console.log("ping"))
  .on("error", error => console.log("error", error))
  .on("end", response => console.log("end"));

// to stop the stream:
client.stream.destroy(); // emits "end" and "error" event
```

## Troubleshooting

### API Errors

Api errors are returned (with "catch" in the Promise api or with "err" param in the callback api) as an array of errors.
Thus errors described in twitter docs for example as:

```JSON
 { "errors": [ { "code": 88, "message": "Rate limit exceeded" } ] }
```

Would return as :

```
 [ { "code": 88, "message": "Rate limit exceeded" } ]
```

## Credit

Over the years, thanks to:

* [@technoweenie](http://github.com/technoweenie)
* [@jdub](http://github.com/jdub)
* [@desmondmorris](http://github.com/desmondmorris)
* [Node Twitter Community](https://github.com/desmondmorris/node-twitter/graphs/contributors)
