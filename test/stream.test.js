/* eslint-disable no-console */

require('dotenv').config();
const Stream = require('../stream');
const Twitter = require('../twitter');

const {
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
  ACCESS_TOKEN,
  ACCESS_TOKEN_SECRET,
} = process.env;

function newClient(subdomain = 'api') {
  return new Twitter({
    subdomain,
    consumer_key: TWITTER_CONSUMER_KEY,
    consumer_secret: TWITTER_CONSUMER_SECRET,
    access_token_key: ACCESS_TOKEN,
    access_token_secret: ACCESS_TOKEN_SECRET,
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// https://30secondsofcode.org/object#pick
function pick(obj, arr) {
  return arr.reduce(
    (acc, curr) => (curr in obj && (acc[curr] = obj[curr]), acc),
    {},
  );
}

const client = newClient();
let stream;

// Prolific users from https://socialblade.com/twitter/top/100/tweets that are still active.
// Get with $('div.table-cell a').map(function () { return this.href }) then use
// users/lookup to convert to IDs.
const chattyUserIds = [
  '63299591', '115639376', '4823945834', '2669983818', '6529402', '362413805',
  '450395397', '15007299', '132355708', '561669474', '2213312341', '2050001283',
  '89142182', '2316574981', '133684052', '255409050', '15518000', '124172948',
  '225647847', '3012764258', '382430644', '42832810', '2233720891', '290395312',
  '50706690', '1388673048', '414306138', '155409802', '21976463', '1179710990',
  '130426181', '171299971', '32453798', '22279680', '22274998', '59804598',
  '3048544857', '17872077', '85741735', '3032932864', '120421476', '473656787',
  '876302191', '717628618906570752', '15518784', '152641509', '5950272',
  '416383737', '2569759392', '165796189', '1680484418', '108192135', '3007312628',
  '32771325', '764410142679035904', '19272300', '829411574', '68956490',
  '2836271637', '392599269', '1145130336', '52236744', '243133079', '104120518',
  '51684249', '18057450', '1027850761', '1868107663', '213165296', '15503908',
  '1346933186', '2857426909', '2814731582', '453780255', '3027662932', '23719043',
  '486288760', '121190725', '2942062137', '19286574', '21033096', '271986064',
];

const trackKeywords = [
  'the,to,and,in,you,for,my,at,me',
  'i,a,is,it,of,on,that,with,do',
];
// Passed when run standalone: 20 * 20s; 20 * 15s failed. All failures happened before trying to create the 3rd stream.
const N = 10;

function switchStream({ count, waitBetweenStreams, done, errorHandler }) {
  setTimeout(() => {
    stream = client.stream('statuses/filter', {
      track: trackKeywords[count % 2],
    });
    stream
      .on('data', tweet => {
        console.log(`Tweet from stream #${count}: ${tweet.text}`);
        stream.destroy();  // process.nextTick(() => stream.destroy());  // works too
        if (count === N)
          done();
        else
          switchStream({
            count: count + 1,
            waitBetweenStreams,
            done,
            errorHandler,
          });
      })
      .on('error', error => {
        error.count = count;
        errorHandler(error);
      });
  }, waitBetweenStreams);
}

it('should default export to be a function', () => {
  expect(new Stream()).toBeInstanceOf(Stream);
});

describe('streams', () => {
  beforeEach(() => {
    console.log(new Date().toISOString(), 'Waiting 60s...');
    return sleep(60 * 1000);
    //console.log(new Date().toISOString(), 'Done waiting.');
  }, 61 * 1000);

  const waitLongEnough = 30 * 1000;  // 20s was enough on 2019-03-21, but not now...
  it('should reuse stream N times', done => {
    console.log(new Date().toISOString(), 'Starting reuse N times test...');
    // 'Too many connections – your app established too many simultaneous connections to the data stream. When this occurs, Twitter will wait 1 minute, and then disconnect the most recently established connection if the limit is still being exceeded.' -- https://developer.twitter.com/en/docs/tutorials/consuming-streaming-data.html
    switchStream({
      count: 1,
      waitBetweenStreams: waitLongEnough,
      done,
      errorHandler: error => {
        console.log('Error switching stream', error);
        const fields = pick(error, ['status', 'statusText', 'count']);
        expect(fields).toMatchObject({
          status: 200,
          statusText: 'OK',
          count: N,
        }); // force fail
        done();
      },
    });
  }, (N + 1) * waitLongEnough * 1000);

  // This test exceeds Twitter's stream rate limit, so it must be the last
  it('should fail when switching from one stream to another too fast', done => {
    console.log(new Date().toISOString(), 'Starting stream reuse withOUT wait, which will FAIL...');
    switchStream({
      count: 1,
      waitBetweenStreams: 1000,
      errorHandler: error => {
        const fields = pick(error, [
          'status',
          'statusText',
          'count',
          'message',
          'source',
        ]);
        if (fields.status)
          expect(fields).toMatchObject({
            status: 420,
            statusText: 'Enhance Your Calm',
            count: expect.any(Number),
          });
        else {
          expect(fields).toMatchObject({
            source: 'Exceeded connection limit for user',
            message: 'Unexpected token E in JSON at position 0',
          });
          done();
        }
      },
    });
  });

  // This test needs to be last because it appears that Twitter doesn't register
  // the stream being destroyed. If this test precedes the 'should reuse stream N times'
  // test, the latter will fail, even though on its own, it can reuse the stream 20+ times.
  it('should filter realtime tweets from up to 5000 users', done => {
    console.log(new Date().toISOString(), 'Starting 5000 users test...');
    // https://developer.twitter.com/en/docs/tweets/filter-realtime/api-reference/post-statuses-filter
    stream = client.stream('statuses/filter', {
      follow: [
        // First pass a ton of times an account that doesn't tweet often, to stress-test the POST body
        ...Array(4900).fill('15008676'),  // @dandv
        ...chattyUserIds,
      ],
    });

    stream
      .on('data', () => {
        // Within seconds, one of those prolific accounts will tweet something.
        // Destroy the stream, or else the script will not terminate.
        stream.destroy();
        done();
        console.log(new Date().toISOString(), 'Stream to follow users was allegedly destroyed');
      })
      .on('error', error => {
        // Force fail
        expect(error).toMatchObject({
          status: 200,
        });
      });
  }, 60 * 1000);

});
