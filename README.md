# Twitter Lite [![npm](https://img.shields.io/npm/v/twitter-lite.svg)](https://npm.im/twitter-lite) [![travis](https://travis-ci.org/preposterous/twitter-lite.svg?branch=master)](https://travis-ci.org/preposterous/twitter-lite)

A lightweight, fully-featured, client & server library for the Twitter API

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

```es6
const client = new Twitter({
  subdomain: "api",
  consumer_key: "xyz" // from Twitter.
  consumer_secret: "xyz" // from Twitter.
  access_token_key: "abc" // from your User (oauth_token)
  access_token_secret: "abc" // from your User (oauth_token_secret)
})

client.get("account/verify_credentials").then(results => {
  console.log("results", results)
}).catch(console.error)
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
