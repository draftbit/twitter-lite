const Twitter = require("./twitter");

it("should default export to be a function", () => {
  expect(new Twitter()).toBeInstanceOf(Twitter);
});

it("should return the API URL", () => {
  expect(new Twitter().url).toEqual("https://api.twitter.com/1.1");
})
