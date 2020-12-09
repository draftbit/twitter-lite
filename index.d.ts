/**
 * Typings for twitter-lite
 *
 * @version 0.10-1.0
 * @author Floris de Bijl <@fdebijl>
 *
 * @example
 * const Twitter = require('twitter-lite')
 *
 * const twitter = new Twitter({
 *  consumer_key: 'XYZ',
 *  consumer_secret: 'XYZ',
 *  access_token_key: 'XYZ',
 *  access_token_secret: 'XYZ'
 * });
 *
 * @example
 * // Enable esModuleInterop in your tsconfig to import typings
 * import Twitter, { TwitterOptions } from 'twitter-lite'
 *
 * const config: TwitterOptions = {
 *  consumer_key: 'XYZ',
 *  consumer_secret: 'XYZ',
 *  access_token_key: 'XYZ',
 *  access_token_secret: 'XYZ'
 * };
 *
 * const twitter = new Twitter(config);
 */

/// <reference types="node" />
import { EventEmitter } from 'events';
import * as OAuth from 'oauth-1.0a';

export default class Twitter {
  private authType: AuthType;
  private url: string;
  private oauth: string;
  private config: TwitterOptions;
  private client: OAuth;
  private token: KeySecret;

  constructor(options: TwitterOptions);

  /**
   * Parse the JSON from a Response object and add the Headers under `_headers`
   */
  private static _handleResponse(response: Response): Promise<object>;

  getBearerToken(): Promise<BearerResponse>;

  /** The value you specify here will be used as the URL a user is redirected to should they approve your application's access to their account. Set this to oob for out-of-band pin mode. */
  getRequestToken(twitterCallbackUrl: string | 'oob'): Promise<TokenResponse>;

  getAccessToken(options: AccessTokenOptions): Promise<AccessTokenResponse>;

  /**
   * Construct the data and headers for an authenticated HTTP request to the Twitter API
   * @param {'GET | 'POST' | 'PUT'}
   * @param {string} resource - the API endpoint
   */
  private _makeRequest(
    method: 'GET' | 'POST' | 'PUT',
    resource: string,
    parameters: object
  ): {
    requestData: { url: string; method: string };
    headers: { Authorization: string } | OAuth.Header;
  };

  /**
   * Send a GET request
   * @type {T = any} Expected type for the response from this request, generally `object` or `array`.
   * @param {string} resource - endpoint, e.g. `followers/ids`
   * @param {object} [parameters] - optional parameters
   * @returns {Promise<T>} Promise resolving to the response from the Twitter API.
   *   The `_header` property will be set to the Response headers (useful for checking rate limits)
   */
  public get<T = any>(resource: string, parameters?: object): Promise<T>;

  /**
   * Send a POST request
   * @type {T = any} Expected type for the response from this request, generally `object` or `array`.
   * @param {string} resource - endpoint, e.g. `users/lookup`
   * @param {object} body - POST parameters object.
   *   Will be encoded appropriately (JSON or urlencoded) based on the resource
   * @returns {Promise<any>} Promise resolving to the response from the Twitter API.
   *   The `_header` property will be set to the Response headers (useful for checking rate limits)
   */
  public post<T = any>(resource: string, body: object): Promise<T>;

  /**
   * Send a PUT request
   * @type {T = any} Expected type for the response from this request, generally `object` or `array`.
   * @param {string} resource - endpoint e.g. `direct_messages/welcome_messages/update`
   * @param {object} parameters - required or optional query parameters
   * @param {object} body - PUT request body
   * @returns {Promise<any>} Promise resolving to the response from the Twitter API.
   */
  public put<T = any>(
    resource: string,
    parameters: object,
    body: object
  ): Promise<T>;

  /**
   * Open a stream to a specified endpoint
   *
   * @param {string} resource - endpoint, e.g. `statuses/filter`
   * @param {object} parameters
   * @returns {Stream}
   */
  public stream(resource: string, parameters: object): Stream;
}

/* In reality snowflakes are BigInts. Once BigInt is supported by browsers and Node per default, we could adjust this type.
Currently Twitter themselves convert it to strings for the API though, so this change will come some time in the far future. */
type snowflake = string;

interface TwitterOptions {
  /** "api" is the default (change for other subdomains) */
  subdomain?: string;
  /** version "1.1" is the default (change for other subdomains) */
  version?: string;
  /** version "2" does not use .json for endpoints, defaults to true */
  extension?: boolean;
  /** consumer key from Twitter. */
  consumer_key: string;
  /** consumer secret from Twitter */
  consumer_secret: string;
  /** access token key from your User (oauth_token) */
  access_token_key?: OauthToken;
  /** access token secret from your User (oauth_token_secret) */
  access_token_secret?: OauthTokenSecret;
  /** bearer token */
  bearer_token?: string;
}

type OauthToken = string;
type OauthTokenSecret = string;
type AuthType = 'App' | 'User';

interface KeySecret {
  key: string;
  secret: string;
}

interface AccessTokenOptions {
  /** If using the OAuth web-flow, set these parameters to the values returned in the callback URL. If you are using out-of-band OAuth, set the value of oauth_verifier to the pin-code.
   * The oauth_token here must be the same as the oauth_token returned in the request_token step.*/
  oauth_verifier: string | number;
  oauth_token: string;
}

interface BearerResponse {
  token_type: 'bearer';
  access_token: string;
}

type TokenResponse =
  | {
      oauth_token: OauthToken;
      oauth_token_secret: OauthTokenSecret;
      oauth_callback_confirmed: 'true';
    }
  | { oauth_callback_confirmed: 'false' };

interface AccessTokenResponse {
  oauth_token: string;
  oauth_token_secret: string;
  user_id: snowflake;
  screen_name: string;
}

declare class Stream extends EventEmitter {
  constructor();

  parse(buffer: Buffer): void;
  destroy(): void;
}
