const Stream = require("./stream");

it("should default export to be a function", () => {
  expect(new Stream()).toBeInstanceOf(Stream);
});
