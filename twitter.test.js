const Twitter = require("./twitter");

it("should default export to be a function", () => {
  expect(new Twitter()).toBeInstanceOf(Twitter);
});
