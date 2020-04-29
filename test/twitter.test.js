require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Twitter = require('../twitter');

const {
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
  ACCESS_TOKEN,
  ACCESS_TOKEN_SECRET,
} = process.env;

const STRING_WITH_SPECIAL_CHARS = "`!@#$%^&*()-_=+[{]}\\|;:'\",<.>/? ✓";
const DIRECT_MESSAGE_RECIPIENT_ID = '1253003423055843328'; // https://twitter.com/twlitetest
const TEST_IMAGE = fs.readFileSync(path.join(__dirname, 'test.gif'));

function newClient(subdomain = 'api') {
  return new Twitter({
    subdomain,
    consumer_key: TWITTER_CONSUMER_KEY,
    consumer_secret: TWITTER_CONSUMER_SECRET,
    access_token_key: ACCESS_TOKEN,
    access_token_secret: ACCESS_TOKEN_SECRET,
  });
}

// Used when testing DMs to avoid getting flagged for abuse
function randomString() {
  return Math.random().toString(36).substr(2, 11);
}

function htmlEscape(string) {
  return string
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

describe('core', () => {
  it('should default export to be a function', () => {
    expect(new Twitter()).toBeInstanceOf(Twitter);
  });

  it('should return the API URL', () => {
    expect(new Twitter().url).toEqual('https://api.twitter.com/1.1');
  });

  it('should return a stream API URL', () => {
    const options = { subdomain: 'stream' };
    expect(new Twitter(options).url).toEqual('https://stream.twitter.com/1.1');
  });
});

describe('auth', () => {
  it('should fail on invalid access_token_secret', async () => {
    const client = new Twitter({
      subdomain: 'api',
      consumer_key: TWITTER_CONSUMER_KEY,
      consumer_secret: TWITTER_CONSUMER_SECRET,
      access_token_key: ACCESS_TOKEN,
      access_token_secret: 'xyz',
    });

    expect.assertions(1);
    try {
      await client.get('account/verify_credentials');
    } catch (e) {
      expect(e).toMatchObject({
        errors: [{ code: 32, message: 'Could not authenticate you.' }],
      });
    }
  });

  it('should fail on invalid or expired token', async () => {
    const client = new Twitter({
      subdomain: 'api',
      consumer_key: 'xyz',
      consumer_secret: 'xyz',
      access_token_key: 'xyz',
      access_token_secret: 'xyz',
    });

    expect.assertions(1);
    try {
      await client.get('account/verify_credentials');
    } catch (e) {
      expect(e).toMatchObject({
        errors: [{ code: 89, message: 'Invalid or expired token.' }],
      });
    }
  });

  it('should verify credentials with correct tokens', async () => {
    const client = newClient();

    const response = await client.get('account/verify_credentials');
    expect(response).toHaveProperty('screen_name');
  });

  it('should use bearer token successfully', async () => {
    const user = new Twitter({
      consumer_key: TWITTER_CONSUMER_KEY,
      consumer_secret: TWITTER_CONSUMER_SECRET,
    });

    const response = await user.getBearerToken();
    expect(response).toMatchObject({
      token_type: 'bearer',
    });
    const app = new Twitter({
      bearer_token: response.access_token,
    });
    const rateLimits = await app.get('application/rate_limit_status', {
      resources: 'statuses',
    });
    // This rate limit is 75 for user auth and 300 for app auth
    expect(
      rateLimits.resources.statuses['/statuses/retweeters/ids'].limit,
    ).toEqual(300);
  });
});

describe('rate limits', () => {
  let client;
  beforeAll(() => (client = newClient()));

  it(
    'should get rate limited',
    async () => {
      expect.assertions(2); // assume we were rate limited by a previous test and go straight to `catch`
      try {
        const response = await client.get('help/configuration');
        // Since this didn't throw, we'll be running 2 more assertions below
        expect.assertions(4);
        expect(response).toHaveProperty('photo_sizes');
        expect(response._headers).toHaveProperty('x-rate-limit-limit', ['15']);
        let [remaining] = response._headers['x-rate-limit-remaining'];
        while (
          remaining-- >= -1 // force exceeding the rate limit
        )
          await client.get('help/configuration');
      } catch (e) {
        expect(e.errors[0]).toHaveProperty('code', 88); // Rate limit exceeded
        expect(e._headers).toHaveProperty('x-rate-limit-remaining', ['0']);
      }
    },
    10 * 1000,
  );
});

describe('posting', () => {
  let client;
  beforeAll(() => (client = newClient()));

  it('should DM user, including special characters', async () => {
    const message = randomString(); // prevent overzealous abuse detection

    // POST with JSON body and no parameters per https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/new-event
    const response = await client.post('direct_messages/events/new', {
      event: {
        type: 'message_create',
        message_create: {
          target: {
            recipient_id: DIRECT_MESSAGE_RECIPIENT_ID,
          },
          message_data: {
            text: message + STRING_WITH_SPECIAL_CHARS,
            // https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/new-event#message-data-object
            // says "URL encode as necessary", but applying encodeURIComponent results in verbatim %NN being sent
          },
        },
      },
    });
    expect(response).toMatchObject({
      event: {
        type: 'message_create',
        id: expect.stringMatching(/^\d+$/),
        created_timestamp: expect.any(String),
        message_create: {
          message_data: {
            text: htmlEscape(message + STRING_WITH_SPECIAL_CHARS),
          },
        },
      },
    });
  });

  it('should send typing indicator and parse empty response', async () => {
    // https://developer.twitter.com/en/docs/direct-messages/typing-indicator-and-read-receipts/api-reference/new-typing-indicator
    const response = await client.post('direct_messages/indicate_typing', {
      recipient_id: DIRECT_MESSAGE_RECIPIENT_ID,
    });
    expect(response).toEqual({ _headers: expect.any(Object) });
  });

  it('should post status update with escaped characters, then delete it', async () => {
    const message = randomString(); // prevent overzealous abuse detection

    // https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/post-statuses-update
    const response = await client.post('statuses/update', {
      status: STRING_WITH_SPECIAL_CHARS + message + STRING_WITH_SPECIAL_CHARS,
    });

    expect(response).toMatchObject({
      text: htmlEscape(
        STRING_WITH_SPECIAL_CHARS + message + STRING_WITH_SPECIAL_CHARS,
      ),
    });
    const id = response.id_str;
    const deleted = await client.post('statuses/destroy', {
      id,
    });
    expect(deleted).toMatchObject({
      id_str: id,
    });
  });
});

describe('uploading', () => {
  let uploadClient;
  beforeAll(() => (uploadClient = newClient('upload')));

  it('should upload a picture, and add alt text to it', async () => {
    // Upload picture
    const base64Image = new Buffer(TEST_IMAGE).toString('base64');
    const mediaUploadResponse = await uploadClient.post('media/upload', {
      media_data: base64Image,
    });
    expect(mediaUploadResponse).toMatchObject({
      media_id_string: expect.any(String),
    });

    // Set alt text
    const imageAltString = 'Animated picture of a dancing banana';
    await uploadClient.post('media/metadata/create', {
      media_id: mediaUploadResponse.media_id_string,
      alt_text: { text: imageAltString },
    });
  });
});

describe('putting', () => {
  let client;
  beforeAll(() => (client = newClient()));
  /**
   * For this test you need to have opted to receive messages from anyone at https://twitter.com/settings/safety
   * and your demo app needs to have access to read, write, and direct messages.
   */
  it('can update welcome message', async () => {
    const newWelcomeMessage = await client.post(
      'direct_messages/welcome_messages/new',
      {
        welcome_message: {
          name: 'simple_welcome-message 01',
          message_data: {
            text: 'Welcome!',
          },
        },
      },
    );

    const updatedWelcomeMessage = await client.put(
      'direct_messages/welcome_messages/update',
      {
        id: newWelcomeMessage.welcome_message.id,
      },
      {
        message_data: {
          text: 'Welcome!!!',
        },
      },
    );

    expect(updatedWelcomeMessage.welcome_message.message_data.text).toEqual(
      'Welcome!!!',
    );
  });
});

describe('misc', () => {
  let client;
  beforeAll(() => (client = newClient()));

  it('should get full text of retweeted tweet', async () => {
    const response = await client.get('statuses/show', {
      id: '1019171288533749761', // a retweet by @dandv of @naval
      tweet_mode: 'extended',
    });
    // This is @naval's original tweet
    expect(response.retweeted_status.full_text).toEqual(
      '@jdburns4 “Retirement” occurs when you stop sacrificing today for an imagined tomorrow. You can retire when your passive income exceeds your burn rate, or when you can make a living doing what you love.',
    );
    // For the retweet, "truncated" comes misleadingly set to "false" from the API, and the "full_text" is limited to 140 chars
    expect(response.truncated).toEqual(false);
    expect(response.full_text).toEqual(
      'RT @naval: @jdburns4 “Retirement” occurs when you stop sacrificing today for an imagined tomorrow. You can retire when your passive income…',
    );
  });

  it('should have favorited at least one tweet ever', async () => {
    const response = await client.get('favorites/list');
    expect(response[0]).toHaveProperty('id_str');
  });

  it('should fail to follow unspecified user', async () => {
    expect.assertions(1);
    try {
      await client.post('friendships/create');
    } catch (e) {
      expect(e).toMatchObject({
        errors: [{ code: 108, message: 'Cannot find specified user.' }],
      });
    }
  });

  it('should follow user', async () => {
    const response = await client.post('friendships/create', {
      screen_name: 'mdo',
    });
    expect(response).toMatchObject({
      name: 'Mark Otto',
    });
  });

  it('should unfollow user', async () => {
    const response = await client.post('friendships/destroy', {
      user_id: '15008676',
    });
    expect(response).toMatchObject({
      name: 'Dan Dascalescu',
    });
  });

  it('should get details about 100 users with 18-character ids', async () => {
    const userIds = [
      ...Array(99).fill('928759224599040001'),
      '711030662728437760',
    ].join(',');
    const expectedIds = [
      { id_str: '928759224599040001' },
      { id_str: '711030662728437760' },
    ];
    // Use POST per https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-users-lookup
    const usersPost = await client.post('users/lookup', {
      user_id: userIds,
    });
    delete usersPost._headers; // to not confuse Jest - https://github.com/facebook/jest/issues/5998#issuecomment-446827454
    expect(usersPost).toMatchObject(expectedIds);
    // Check if GET worked the same
    const usersGet = await client.get('users/lookup', { user_id: userIds });
    expect(usersGet.map((u) => u)).toMatchObject(expectedIds); // map(u => u) is an alternative to deleting _headers
  });

  it('should be unable to get details about suspended user', async () => {
    const nonexistentScreenName = randomString() + randomString();
    try {
      // https://twitter.com/fuckyou is actually a suspended user, but the API doesn't differentiate from nonexistent users
      await client.get('users/lookup', {
        screen_name: `fuckyou,${nonexistentScreenName}`,
      });
    } catch (e) {
      expect(e).toMatchObject({
        errors: [{ code: 17, message: 'No user matches for specified terms.' }],
      });
    }
  });

  it('should get timeline', async () => {
    const response = await client.get('statuses/user_timeline', {
      screen_name: 'twitterapi',
      count: 2,
    });
    expect(response).toHaveLength(2);
  });
});
