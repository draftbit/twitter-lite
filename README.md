# Twitter Lite [![npm](https://img.shields.io/npm/v/twitter-lite.svg)](https://npm.im/twitter-lite) [![travis](https://travis-ci.org/preposterous/twitter-lite.svg?branch=master)](https://travis-ci.org/preposterous/twitter-lite)

A tiny (591B), fully-featured, client & server library for the Twitter API

- Promise-first via Async / Await
- Up-to-date
- Under 1kb

## Installation

```
yarn add twitter-lite
```

```
npm install twitter-lite
```

## Usage

- Create an app on [https://apps.twitter.com/](https://apps.twitter.com)
- Grab the Consumer Key (API Key) and Consumer Secret (API Secret) from Keys and Access Tokens
- Make sure you set the right access level for your app

### App vs. User

Twitter has two different authentication options:
- App: higher rate limits. Great for building your own Twitter App
- User: lower rate limits. Great for making requests on behalf of a User.

**User** authentication requires:
- `consumer_key`
- `consumer_secret`
- `access_token_key`
- `access_token_secret`

**App** authentication requires:
- `bearer_token`

App authentication is a simple header behind the scenes:

```es6
headers: {
  Authorization: `Bearer ${bearer_token}`
}
```

### Verifying Credentials Example (User auth)

```es6
const client = new Twitter({
  subdomain: "api",
  consumer_key: "xyz" // from Twitter.
  consumer_secret: "xyz" // from Twitter.
  access_token_key: "abc" // from your User (oauth_token)
  access_token_secret: "abc" // from your User (oauth_token_secret)
})

client.get("account/verify_credentials")
.then(results => { console.log("results", results) })
.catch(console.error)
```

### App authentication Example

```es6
const client = new Twitter({
  subdomain: "api",
  bearer_token: "Bearer ABC123XYZ" // generate a Bearer token
})

client.get("users/lookup")
.then(results => { console.log("results", results ) })
.catch(console.error)
```

## Streams

TBD

I don't know shit about streams. If you can help make this work with streams, I would appreciate & encourage it!

## Credit

Over the years, thanks to:
- [@technoweenie](http://github.com/technoweenie)
- [@jdub](http://github.com/jdub)
- [@desmondmorris](http://github.com/desmondmorris)
- [Node Twitter Community](https://github.com/desmondmorris/node-twitter/graphs/contributors)
