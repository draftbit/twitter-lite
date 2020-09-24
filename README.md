# Twitter Lite

A tiny, full-featured, modern client / server library for the [Twitter API](https://developer.twitter.com/en/docs/basics/things-every-developer-should-know).

[![npm](https://img.shields.io/npm/v/twitter-lite.svg)](https://npm.im/twitter-lite) [![travis](https://travis-ci.org/draftbit/twitter-lite.svg?branch=master)](https://travis-ci.org/draftbit/twitter-lite)

## Features

- Promise driven via Async / Await
- REST and Stream support
- [Typescript support](https://github.com/draftbit/twitter-lite/blob/master/index.d.ts)
- Works both in Node and in browsers
- Rate limiting support
- Under 1kb
- Minimal dependencies
- Test suite

## Why

We have built this library because existing ones [have not been recently maintained](https://github.com/desmondmorris/node-twitter), or depend on [outdated](https://github.com/ttezel/twit/issues/411) [libraries](https://github.com/ttezel/twit/issues/412).

## Installation

```sh
yarn add twitter-lite
```

```sh
npm install twitter-lite
```

Then you can include the following at the top of your code:

```es6
import Twitter from 'twitter-lite';

const client = new Twitter({
  ...
})

client.get(...)
client.post(...)
```

## Usage

- Create an app on [https://apps.twitter.com/](https://apps.twitter.com)
- Grab the Consumer Key (API Key) and Consumer Secret (API Secret) from Keys and Access Tokens
- Make sure you set the right access level for your app
- If you want to use user-based authentication, grab the access token key and secret as well

### App vs. User authentication

Twitter has two different authentication options:

- App: higher rate limits. Great for building your own Twitter App.
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
  Authorization: `Bearer ${bearer_token}`;
}
```

You can get the bearer token by calling `.getBearerToken()`.

### Verifying credentials example (user auth)

```es6
const client = new Twitter({
  subdomain: "api", // "api" is the default (change for other subdomains)
  version: "1.1", // version "1.1" is the default (change for other subdomains)
  consumer_key: "abc", // from Twitter.
  consumer_secret: "def", // from Twitter.
  access_token_key: "uvw", // from your User (oauth_token)
  access_token_secret: "xyz" // from your User (oauth_token_secret)
});

client
  .get("account/verify_credentials")
  .then(results => {
    console.log("results", results);
  })
  .catch(console.error);
```

### App authentication example

```es6
const user = new Twitter({
  consumer_key: "abc",
  consumer_secret: "def"
});

const response = await user.getBearerToken();
const app = new Twitter({
  bearer_token: response.access_token
});
```

### Oauth authentication

According to the [docs](https://developer.twitter.com/en/docs/basics/authentication/api-reference/authenticate) this helps you get access token from your users.

- [Request Token documentation](https://developer.twitter.com/en/docs/basics/authentication/api-reference/request_token)
- [Access Token documentation](https://developer.twitter.com/en/docs/basics/authentication/api-reference/access_token)

```es6
const client = new Twitter({
  consumer_key: "xyz",
  consumer_secret: "xyz"
});

client
  .getRequestToken("http://callbackurl.com")
  .then(res =>
    console.log({
      reqTkn: res.oauth_token,
      reqTknSecret: res.oauth_token_secret
    })
  )
  .catch(console.error);
```

Then you redirect your user to `https://api.twitter.com/oauth/authenticate?oauth_token=xyz123abc`, and once you get the verifier and the token, you pass them on to the [next stage of the authentication](https://developer.twitter.com/en/docs/basics/authentication/api-reference/access_token).

```es6
const client = new Twitter({
  consumer_key: "xyz",
  consumer_secret: "xyz"
});

client
  .getAccessToken({
    oauth_verifier: oauthVerifier,
    oauth_token: oauthToken
  })
  .then(res =>
    console.log({
      accTkn: res.oauth_token,
      accTknSecret: res.oauth_token_secret,
      userId: res.user_id,
      screenName: res.screen_name
    })
  )
  .catch(console.error);
```

And this will return you your `access_token` and `access_token_secret`.

### Tweeting a thread

- [statuses/update documentation](https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/post-statuses-update)

```es6
const client = new Twitter({
  consumer_key: "xyz",
  consumer_secret: "xyz",
  access_token_key: "xyz",
  access_token_secret: "xyz"
});

async function tweetThread(thread) {
  let lastTweetID = "";
  for (const status of thread) {
    const tweet = await client.post("statuses/update", {
      status: status,
      in_reply_to_status_id: lastTweetID,
      auto_populate_reply_metadata: true
    });
    lastTweetID = tweet.id_str;
  }
}

const thread = ["First tweet", "Second tweet", "Third tweet"];
tweetThread(thread).catch(console.error);
```

## Streams

To learn more about the streaming API visit the [Twitter Docs](https://developer.twitter.com/en/docs/tweets/filter-realtime/api-reference/post-statuses-filter.html). The streaming API works only in Node.

```es6
const client = new Twitter({
  consumer_key: "xyz" // from Twitter.
  consumer_secret: "xyz" // from Twitter.
  access_token_key: "abc" // from your User (oauth_token)
  access_token_secret: "abc" // from your User (oauth_token_secret)
});

const parameters = {
  track: "#bitcoin,#litecoin,#monero",
  follow: "422297024,873788249839370240",  // @OrchardAI, @tylerbuchea
  locations: "-122.75,36.8,-121.75,37.8",  // Bounding box -	San Francisco
};

const stream = client.stream("statuses/filter", parameters)
  .on("start", response => console.log("start"))
  .on("data", tweet => console.log("data", tweet.text))
  .on("ping", () => console.log("ping"))
  .on("error", error => console.log("error", error))
  .on("end", response => console.log("end"));

// To stop the stream:
process.nextTick(() => stream.destroy());  // emits "end" and "error" events
```

To stop a stream, call `stream.destroy()`. That might take a while though, if the stream receives a lot of traffic. Also, if you attempt to destroy a stream from an `on` handler, you _may_ get an error about writing to a destroyed stream.
In that case, try to [defer](https://stackoverflow.com/questions/49804108/write-after-end-stream-error/53878933#53878933) the `destroy()` call:

```es6
process.nextTick(() => stream.destroy());
```

After calling `stream.destroy()`, you can recreate the stream, if you wait long enough - see the "should reuse stream N times" test. Note that Twitter may return a "420 Enhance your calm" error if you switch streams too fast. There are no response headers specifying how long to wait, and [the error](https://stackoverflow.com/questions/13438965/avoid-420s-with-streaming-api), as well as [streaming limits](https://stackoverflow.com/questions/34962677/twitter-streaming-api-limits) in general, are poorly documented. Trial and error has shown that for tracked keywords, waiting 20 to 30 seconds between re-creating streams was enough. Remember to also set up the `.on()` handlers again for the new stream.

## Support for Twitter API v2

The new Twitter API v2 no longer requires the `.json` extension on its endpoints. In order to use `v2`, set `version: '2'` and `extension: false`.

```es6
const client = new Twitter({
  version: "2", // version "1.1" is the default (change for v2)
  extension: false, // true is the default (this must be set to false for v2 endpoints)
  consumer_key: "abc", // from Twitter.
  consumer_secret: "def", // from Twitter.
  access_token_key: "uvw", // from your User (oauth_token)
  access_token_secret: "xyz" // from your User (oauth_token_secret)
});
```

## Methods

### .get(endpoint, parameters)

Returns a Promise resolving to the API response object, or rejecting on error. The response and error objects also contain the HTTP response code and [headers](https://developer.twitter.com/en/docs/basics/rate-limiting.html), under the `_headers` key. These are useful to check for [rate limit](#rate-limiting) information.

```es6
const client = new Twitter({
  consumer_key: "xyz",
  consumer_secret: "xyz",
  access_token_key: "abc",
  access_token_secret: "abc"
});

const rateLimits = await client.get("statuses/show", {
  id: "1016078154497048576"
});
```

### .post(endpoint, parameters)

Same return as `.get()`.

Use the `.post` method for actions that change state, or when the total size of the parameters might be too long for a GET request. For [example](https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/post-friendships-create.html), to follow a user:

```es6
const client = new Twitter({
  consumer_key: "xyz",
  consumer_secret: "xyz",
  access_token_key: "abc",
  access_token_secret: "abc"
});

await client.post("friendships/create", {
  screen_name: "dandv"
});
```

The second use case for POST is when you need to pass more parameters than suitable for the length of a URL, such as when [looking up a larger number of user ids or screen names](https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-users-lookup):

```es6
const users = await client.post("users/lookup", {
  screen_name: "longScreenName1,longerScreeName2,...,veryLongScreenName100"
});
```

### .put(endpoint, query_parameters, request_body)

Same return as `.get()` and `.post()`.

Use the `.put` method for actions that update state. For [example](https://developer.twitter.com/en/docs/direct-messages/welcome-messages/api-reference/update-welcome-message), to update a welcome message.

```es6
const client = new Twitter({
  consumer_key: "xyz",
  consumer_secret: "xyz",
  access_token_key: "abc",
  access_token_secret: "abc"
});

const welcomeMessageID = "abc";

await client.put(
  "direct_messages/welcome_messages/update",
  {
    id: welcomeMessageID
  },
  {
    message_data: {
      text: "Welcome!!!"
    }
  }
);
```

### .getBearerToken()

See the [app authentication example](#app-authentication-example).

### .getRequestToken(twitterCallbackUrl)

See the [OAuth example](#oauth-authentication).

### .getAccessToken(options)

See the [OAuth example](#oauth-authentication).

## Examples

You can find many more examples for various resources/endpoints in [the tests](test).

## Troubleshooting

### Headers on success

```es6
const tweets = await client.get("statuses/home_timeline");
console.log(`Rate: ${tweets._headers.get('x-rate-limit-remaining')} / ${tweets._headers.get('x-rate-limit-limit')}`);
const delta = (tweets._headers.get('x-rate-limit-reset') * 1000) - Date.now()
console.log(`Reset: ${Math.ceil(delta / 1000 / 60)} minutes`);
```

### API errors

`.get` and `.post` reject on error, so you can use try/catch to handle errors. The error object contains an `errors` property with the error `code` and `message`, and a `_headers` property with the the HTTP response code and [Headers](https://developer.twitter.com/en/docs/basics/rate-limiting.html) object returned by the Twitter API.

```es6
try {
  const response = await client.get("some/endpoint");
  // ... use response here ...
} catch (e) {
  if ('errors' in e) {
    // Twitter API error
    if (e.errors[0].code === 88)
      // rate limit exceeded
      console.log("Rate limit will reset on", new Date(e._headers.get("x-rate-limit-reset") * 1000));
    else
      // some other kind of error, e.g. read-only API trying to POST
  } else {
    // non-API error, e.g. network problem or invalid JSON in response
  }
}
```

#### Rate limiting

A particular case of errors is exceeding the [rate limits](https://developer.twitter.com/en/docs/basics/rate-limits.html). See the example immediately above for detecting rate limit errors, and read [Twitter's documentation on rate limiting](https://developer.twitter.com/en/docs/basics/rate-limiting.html).

### Numeric vs. string IDs

Twitter uses [numeric IDs](https://developer.twitter.com/en/docs/basics/twitter-ids.html) that in practice can be up to 18 characters long. Due to rounding errors, it's [unsafe to use numeric IDs in JavaScript](https://developer.twitter.com/en/docs/basics/things-every-developer-should-know). Always set `stringify_ids: true` when possible, so that Twitter will return strings instead of numbers, and rely on the `id_str` field, rather than on the `id` field.

## Contributing

With the library nearing v1.0, contributions are welcome! Areas especially in need of help involve multimedia (see [#33](https://github.com/draftbit/twitter-lite/issues/33) for example), and adding tests (see [these](https://github.com/ttezel/twit/tree/master/tests) for reference).

### Development

1.  Fork/clone the repo
2.  `yarn/npm install`
3.  Go to <https://apps.twitter.com> and create an app for testing this module. Make sure it has read/write permissions.
4.  Grab the consumer key/secret, and the access token/secret and place them in a [.env](https://www.npmjs.com/package/dotenv) file in the project's root directory, under the following variables:
    ```
    TWITTER_CONSUMER_KEY=...
    TWITTER_CONSUMER_SECRET=...
    ACCESS_TOKEN=...
    ACCESS_TOKEN_SECRET=...
    ```
5.  `yarn/npm test` and make sure all tests pass
6.  Add your contribution, along with test case(s). Note: feel free to skip the ["should DM user"](https://github.com/draftbit/twitter-lite/blob/34e8dbb3efb9a45564275f16473af59dbc4409e5/twitter.test.js#L167) test during development by changing that `it()` call to `it.skip()`, but remember to revert that change before committing. This will prevent your account from being flagged as [abusing the API to send too many DMs](https://github.com/draftbit/twitter-lite/commit/5ee2ce4232faa07453ea2f0b4d63ee7a6d119ce7).
7.  Make sure all tests pass. **NOTE: tests will take over 10 minutes to finish.**
8.  Commit using a [descriptive message](https://chris.beams.io/posts/git-commit/) (please squash commits into one per fix/improvement!)
9.  `git push` and submit your PR!

## Credits

Authors:

- [@dandv](https://github.com/dandv)
- [@peterpme](https://github.com/peterpme)

Over the years, thanks to:

- [@ttezel](https://github.com/ttezel)
- [@technoweenie](http://github.com/technoweenie)
- [@jdub](http://github.com/jdub)
- [@desmondmorris](http://github.com/desmondmorris)
- [Node Twitter
  Community](https://github.com/desmondmorris/node-twitter/graphs/contributors)
- [@dylanirlbeck](https://github.com/dylanirlbeck)
- [@Fdebijl](https://github.com/Fdebijl) - Typescript support
