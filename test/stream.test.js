require("dotenv").config();
const Stream = require("../stream");
const Twitter = require("../twitter");

const {
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
  ACCESS_TOKEN,
  ACCESS_TOKEN_SECRET
} = process.env;

function newClient(subdomain = "api") {
  return new Twitter({
    subdomain,
    consumer_key: TWITTER_CONSUMER_KEY,
    consumer_secret: TWITTER_CONSUMER_SECRET,
    access_token_key: ACCESS_TOKEN,
    access_token_secret: ACCESS_TOKEN_SECRET
  });
}

it("should default export to be a function", () => {
  expect(new Stream()).toBeInstanceOf(Stream);
});

const client = newClient();

describe("functionality", () => {
  it("should filter realtime tweets from up to 5000 users", done => {
    // https://developer.twitter.com/en/docs/tweets/filter-realtime/api-reference/post-statuses-filter
    const stream = client.stream("statuses/filter", {
      follow: [
        // First pass a ton of accounts that don't tweet often (@dandv), to stress-test the POST body
        ...Array(4900).fill("15008676"),
        // Then add prolific users from https://socialblade.com/twitter/top/100/tweets that are
        // still active. Get with $('div.table-cell a').map(function () { return this.href })
        // then use users/lookup to convert to IDs.
        "63299591",
        "115639376",
        "4823945834",
        "2669983818",
        "6529402",
        "362413805",
        "450395397",
        "15007299",
        "132355708",
        "561669474",
        "2213312341",
        "2050001283",
        "89142182",
        "2316574981",
        "133684052",
        "255409050",
        "15518000",
        "124172948",
        "225647847",
        "3012764258",
        "382430644",
        "42832810",
        "2233720891",
        "290395312",
        "50706690",
        "1388673048",
        "414306138",
        "155409802",
        "21976463",
        "1179710990",
        "130426181",
        "171299971",
        "32453798",
        "22279680",
        "22274998",
        "59804598",
        "3048544857",
        "17872077",
        "85741735",
        "3032932864",
        "120421476",
        "473656787",
        "876302191",
        "717628618906570752",
        "15518784",
        "152641509",
        "5950272",
        "416383737",
        "2569759392",
        "165796189",
        "1680484418",
        "108192135",
        "3007312628",
        "32771325",
        "764410142679035904",
        "19272300",
        "829411574",
        "68956490",
        "2836271637",
        "392599269",
        "1145130336",
        "52236744",
        "243133079",
        "104120518",
        "51684249",
        "18057450",
        "1027850761",
        "1868107663",
        "213165296",
        "15503908",
        "1346933186",
        "2857426909",
        "2814731582",
        "453780255",
        "3027662932",
        "23719043",
        "486288760",
        "121190725",
        "2942062137",
        "19286574",
        "21033096",
        "271986064"
      ]
    });

    stream.on("data", tweet => {
      // Within seconds, one of those prolific accounts will tweet something
      done();
      // Destroy the stream, or else the script will not terminate
      stream.destroy();
    });
  });

  // Twitter returns a 420 error (rate limiting) *only* on Travis but test passes locally
  if (process.env.CI !== "Travis")
    it("should switch from one stream to another", done => {
      const stream1 = client.stream("statuses/filter", {
        track: "the,to,and,in,you,for,my,at,me"
      });
      stream1.on("data", tweet => {
        process.nextTick(() => stream1.destroy());
        const stream2 = client.stream("statuses/filter", {
          track: "i,a,is,it,of,on,that,with,do"
        });
        stream2.on("data", tweet => {
          process.nextTick(() => stream2.destroy());
          done();
        });
      });
    });
});
