# v0.9.3, 2019-Mar-25

- Return `_headers` in stream creation errors as well

# v0.9.1, 2019-Jan-16

- Fix encoding of special characters in direct messages ([#38](https://github.com/draftbit/twitter-lite/issues/38))

# v0.9, 2019-Jan-06

## Breaking changes

- `.post()` now only takes two parameters: the resource and the body/parameters. If you were previously passing `null` for the body, just delete that, and the next parameter will become the body.

## Changes

- Properly encode and sign POST parameters/body depending on whether the endpoint takes [`application/json`](https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/new-event) or [`application/x-www-form-urlencoded`](https://developer.twitter.com/en/docs/basics/authentication/guides/creating-a-signature)
- Support empty responses (e.g. those returned by [`direct_messages/indicate_typing`](https://developer.twitter.com/en/docs/direct-messages/typing-indicator-and-read-receipts/api-reference/new-typing-indicator)) (fix [#35](https://github.com/draftbit/twitter-lite/issues/35))

# v0.8, 2018-Dec-13

- Encode special characters in the POST body (fix [#36](https://github.com/draftbit/twitter-lite/issues/36))

# v0.7, 2018-Jul-26

## Breaking changes

- Given that [developers expect promises to reject when they don't return the requested data](https://github.com/ttezel/twit/issues/256), `.get` and `.post` now reject instead of silently returning API errors as an array under the `errors` key of the response object.
