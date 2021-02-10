/* eslint-disable */
import Twitter, { TwitterOptions, Stream } from 'twitter-lite';

const options: TwitterOptions = {
  subdomain: "api",
  version: "1.1",
  consumer_key: 'foobar',
  consumer_secret: 'foobar',
  access_token_key: 'foobar',
  access_token_secret: 'foobar',
};

const UserAuthedTwitter = new Twitter(options);

UserAuthedTwitter
  .get("account/verify_credentials")
  .then(results => {
    console.log("results", results);
  })
  .catch(console.error);

const AppAuthedTwitter = new Twitter({
  consumer_key: 'foobar',
  consumer_secret: 'foobar',
});

(async () => {
  const user = new Twitter({
    consumer_key: "abc",
    consumer_secret: "def"
  });

  const response = await user.getBearerToken();
  const app = new Twitter({
    bearer_token: response.access_token
  });
})();

// OAuth Flow
AppAuthedTwitter
  .getRequestToken("http://callbackurl.com")
  .then(res =>
    console.log({
      reqTkn: res.oauth_token,
      reqTknSecret: res.oauth_token_secret
    })
  )
  .catch(console.error);

AppAuthedTwitter
  .getAccessToken({
    oauth_verifier: 'oauthVerifier',
    oauth_token: 'oauthToken'
  })
  .then(res =>
    console.log({
      accTkn: res.oauth_token,
      accTknSecret: res.oauth_token_secret,
      userId: res.user_id,
      screenName: res.screen_name
    })
  );

// Tweeting a thread
async function tweetThread(thread: string[]) {
  let lastTweetID = "";
  for (const status of thread) {
    const tweet = await UserAuthedTwitter.post("statuses/update", {
      status,
      in_reply_to_status_id: lastTweetID,
      auto_populate_reply_metadata: true
    });
    lastTweetID = tweet.id_str;
  }
}

const thread = ["First tweet", "Second tweet", "Third tweet"];
tweetThread(thread).catch(console.error);

// Streams
const parameters = {
  track: "#bitcoin,#litecoin,#monero",
  follow: "422297024,873788249839370240",  // @OrchardAI, @tylerbuchea
  locations: "-122.75,36.8,-121.75,37.8",  // Bounding box -	San Francisco
};

const stream: Stream = UserAuthedTwitter.stream("statuses/filter", parameters)
  .on("start", response => console.log("start"))
  .on("data", tweet => console.log("data", tweet.text))
  .on("ping", () => console.log("ping"))
  .on("error", error => console.log("error", error))
  .on("end", response => console.log("end"));

// To stop the stream:
process.nextTick(() => stream.destroy());  // emits "end" and "error" events

// API v2
const V2Client = new Twitter({
  version: "2", // version "1.1" is the default (change for v2)
  extension: false, // true is the default (this must be set to false for v2 endpoints)
  consumer_key: "abc", // from Twitter.
  consumer_secret: "def", // from Twitter.
  access_token_key: "uvw", // from your User (oauth_token)
  access_token_secret: "xyz" // from your User (oauth_token_secret)
});

// Methods
const rateLimits = UserAuthedTwitter.get("statuses/show", {
  id: "1016078154497048576"
});

UserAuthedTwitter.post("friendships/create", {
  screen_name: "dandv"
});

UserAuthedTwitter.put(
  "direct_messages/welcome_messages/update",
  {
    id: 'abc'
  },
  {
    message_data: {
      text: "Welcome!!!"
    }
  }
);

// Headers
(async () => {
  const tweets = await UserAuthedTwitter.get("statuses/home_timeline");
  console.log(`Rate: ${tweets._headers.get('x-rate-limit-remaining')} / ${tweets._headers.get('x-rate-limit-limit')}`);
  const delta = (tweets._headers.get('x-rate-limit-reset') * 1000) - Date.now();
  console.log(`Reset: ${Math.ceil(delta / 1000 / 60)} minutes`);
})();

// Regression test for https://github.com/draftbit/twitter-lite/issues/130
(async () => {
  const {
    oauth_token: requestToken,
    oauth_token_secret: requestTokenSecret
  } = await UserAuthedTwitter.getRequestToken('callback url');
})();
