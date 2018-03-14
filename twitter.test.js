const Twitter = require('./twitter')

const {
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
  TWITTER_TOKEN,
  TWITTER_TOKEN_SECRET
} = process.env

it('should default export to be a function', () => {
  expect(new Twitter()).toBeInstanceOf(Twitter)
})

it('should return the API URL', () => {
  expect(new Twitter().url).toEqual('https://api.twitter.com/1.1')
})

it('should return a stream API URL', () => {
  const options = { subdomain: 'stream' }
  expect(new Twitter(options).url).toEqual('https://stream.twitter.com/1.1')
})

it('should fail on invalid access_token_secret', async () => {
  const client = new Twitter({
    subdomain: 'api',
    consumer_key: TWITTER_CONSUMER_KEY,
    consumer_secret: TWITTER_CONSUMER_SECRET,
    access_token_key: TWITTER_TOKEN,
    access_token_secret: 'xyz'
  })

  const results = await client.get('account/verify_credentials')
  expect(results).toEqual({
    errors: [{ code: 32, message: 'Could not authenticate you.' }]
  })
})

it('should fail on invalid or expired token', async () => {
  const client = new Twitter({
    subdomain: 'api',
    consumer_key: 'xyz',
    consumer_secret: 'xyz',
    access_token_key: 'xyz',
    access_token_secret: 'xyz'
  })

  const results = await client.get('account/verify_credentials')
  expect(results).toEqual({
    errors: [{ code: 89, message: 'Invalid or expired token.' }]
  })
})

it('should verify credentials with correct tokens', async () => {
  const client = new Twitter({
    subdomain: 'api',
    consumer_key: TWITTER_CONSUMER_KEY,
    consumer_secret: TWITTER_CONSUMER_SECRET,
    access_token_key: TWITTER_TOKEN,
    access_token_secret: TWITTER_TOKEN_SECRET
  })

  const response = await client.get('account/verify_credentials')
  const results = {
    created_at: response.created_at,
    name: response.name,
    lang: response.lang,
    screen_name: response.screen_name
  }

  expect(results).toEqual({
    created_at: 'Sat Mar 21 18:52:03 +0000 2009',
    name: "Nodejs Testing Account",
    lang: "en",
    screen_name: "nodejs_lite"
  })
})
