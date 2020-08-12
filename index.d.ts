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

declare class Stream extends EventEmitter {
  constructor();

  parse(buffer: Buffer): void;
  destroy(): void;
}

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
  public post<K extends keyof PostResources>(resource: K, body: PostResources[K][0]): Promise<PostResources[K][1]>
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


//#region PostRequestBody

interface BasePostBody {
  /**
   * Desired status ID to do the action
   */
  id?: string | number,
}

interface PostGeneralTweetBody extends BasePostBody {
  /**
   * Whether each tweet returned in a timeline will include a user object including only the status authors numerical ID.  
   * Omit this parameter to receive the complete user object.	
   */
  trim_user?: boolean
}

interface PostLikeTweetBody extends BasePostBody {
  /**
   * The entities node will be omitted when set to false
   */
  include_entities?: boolean
}

interface PostUpdateTweetBody{
  /**
   * The content of the tweet
   */
  status: string,

  /**
   * The ID of an existing tweet that the update is in reply to  
   * Will be ignored if the tweet didn't include the replied tweet's author
   */
  in_reply_to_status_id?: string,

  /**
   * If set to `true` and used with `in_reply_to_status_id`, leading @mentions will be looked up from the original Tweet and added to the new Tweet from there.  
   * This will append @mentions into the metadata of an extended Tweet as a reply chain grows, until the limit on @mentions is reached.  
   * In cases where the original Tweet has been deleted, the reply will fail.	
   */
  auto_populate_reply_metadata?: boolean,

  /**
   * When used with auto_populate_reply_metadata, a comma-separated list of user ids which will be removed from the server-generated @mentions prefix on an extended Tweet. Note that the leading @mention cannot be removed as it would break the in-reply-to-status-id semantics. Attempting to remove it will be silently ignored.
   */
  exclude_reply_user_ids?: string,

  /**
   * In order for a URL to not be counted in the status body of an extended Tweet, provide a URL as a Tweet attachment. This URL must be a Tweet permalink, or Direct Message deep link. Arbitrary, non-Twitter URLs must remain in the status text. URLs passed to the attachment_url parameter not matching either a Tweet permalink or Direct Message deep link will fail at Tweet creation and cause an exception
   */
  attatchment_url?: string,

  /**
   * A comma-delimited list of media_ids to associate with the Tweet. You may include up to 4 photos or 1 animated GIF or 1 video in a Tweet. See Uploading Media for further details on uploading media
   */
  media_ids?: string,

  /**
   * If you upload Tweet media that might be considered sensitive content such as nudity, or medical procedures, you must set this value to true. See Media setting and best practices for more context.
   */
  possibly_sensitive?: boolean,	

  /**
   * The latitude of the location this Tweet refers to. This parameter will be ignored unless it is inside the range -90.0 to +90.0 (North is positive) inclusive. It will also be ignored if there is no corresponding long parameter.
   */
  lat?:	number,

  /**
   * The longitude of the location this Tweet refers to. The valid ranges for longitude are -180.0 to +180.0 (East is positive) inclusive. This parameter will be ignored if outside that range, if it is not a number, if geo_enabled is disabled, or if there no corresponding lat parameter.
   */
  long?:	number,

  /**
   * A place in the world
   */
  place_id?:	string,

  /**
   * Whether or not to put a pin on the exact coordinates a Tweet has been sent from
   */
  display_coordinates?:	boolean,


  /**
   * Whether the response will include a user object including only the author's ID. Omit this parameter to receive the complete user object.
   */
  trim_user?:	boolean,

  /**
   * When set to true, enables shortcode commands for sending Direct Messages as part of the status text to send a Direct Message to a user. When set to false, disables this behavior and includes any leading characters in the status text that is posted	
   */
  enable_dmcommands?:	boolean,

  /**
   * When set to true, causes any status text that starts with shortcode commands to return an API error. When set to false, allows shortcode commands to be sent in the status text and acted on by the API.	
   */
  fail_dmcommands?:	boolean,

  /**
   * Associate an ads card with the Tweet using the card_uri value from any ads card response.
   */
  card_uri?: string
}

//#endregion

//#region AbstractTypes

/**
 * Also known as Favorites
 */
interface Likes {
  
}

// Generated with Quicktype and humanly adapted
// https://app.quicktype.io?share=3JFdoOmOYKfUzjTjk1dk

/**
 * A Tweet Response
 */
export interface Tweet {
  /**
   * Whether the tweet contains coordinate
   */
  coordinates: PointCoordinates | PolygonCoordinates | null;

  /**
   * Whether the tweet is Liked by the current user
   */
  favorited: boolean;

  /**
   * The date of tweet creation
   */
  created_at: string;

  /**
   * Whether the tweet is truncated
   * TODO: Figure out why some tweets are truncated
   */
  truncated: boolean;

  /**
   * The tweet's ID
   */
  id_str: string;

  // TODO: Figure out these
  entities:                       TweetEntities;

  /**
   * The UserID of the person which the tweet is replying to
   */
  in_reply_to_user_id_str: null | string;

  /**
   * The tweet content
   */
  text: string;

  // TODO: Figure out these
  contributors:                   null;

  /**
   * How many times has the tweet been retweeted
   */
  retweet_count: number;

  /**
   * The tweet's ID.  
   * Consider using `id_str`
   */
  id: number;

  /**
   * String representation of `in_reply_to_user_id`
   */
  in_reply_to_status_id_str: null | string;

  /**
   * The coordinates of the tweet
   */
  geo: Coordinates | null;

  /**
   * Whether the tweet is has been retweeted by the current user
   */
  retweeted: boolean;

  /**
   * The TweetID of the tweet which the current tweet is replying to  
   * Consider using `in_reply_to_user_id_str` instead
   */
  in_reply_to_user_id: number | null;

  /**
   * Whether the tweet might be sensitive
   */
  possibly_sensitive?:  boolean;

  /**
   * The GeoPlace of the tweet
   * TODO: Find an example of a GeoPlace
   */
  place:                          null;

  /**
   * The author of the Tweet
   */
  user: User;
  possibly_sensitive_editable?:   boolean;
  source:                         string;
  in_reply_to_screen_name:        null | string;
  in_reply_to_status_id:          number | null;
  extended_entities?:             ExtendedEntities;
  is_quote_status?:               boolean;
  favorite_count?:                number;
  possibly_sensitive_appealable?: boolean;
  lang?:                          string;
  _headers?:                      Headers;
}

export interface Headers {
}

export interface PointCoordinates {
  type: 'Point';
  coordinates: number[];
}
export interface PolygonCoordinates {
  type: 'Polygon';
  coordinates: number[][];
}

export interface TweetEntities {
  urls:          Url[];
  hashtags:      Hashtag[];
  user_mentions: any[];
  symbols?:      any[];
  media?:        Media[];
}

export interface Hashtag {
  text:    string;
  indices: number[];
}

export interface Media {
  id:              number;
  id_str:          string;
  indices:         number[];
  media_url:       string;
  media_url_https: string;
  url:             string;
  display_url:     string;
  expanded_url:    string;
  type:            string;
  sizes:           MediaSize;
}

export interface MediaSize {
  medium: MediaResolution;
  small:  MediaResolution;
  thumb:  MediaResolution;
  large:  MediaResolution;
}

export interface MediaResolution {
  w: number;
  h: number;
  resize: string;
}

export interface Url {
  expanded_url: string;
  url:          string;
  indices:      number[];
  display_url:  string;
}

export interface ExtendedEntities {
  media: Media[];
}

export interface User {
  name:                               string;
  profile_sidebar_border_color:       string;
  profile_sidebar_fill_color:         string;
  profile_background_tile:            boolean;
  profile_image_url:                  string;
  created_at:                         string;
  location:                           string;
  is_translator:                      boolean;
  follow_request_sent:                boolean;
  id_str:                             string;
  profile_link_color:                 string;
  entities:                           UserEntities;
  default_profile:                    boolean;
  contributors_enabled:               boolean;
  url:                                null | string;
  favourites_count:                   number;
  utc_offset:                         number | null;
  id:                                 number;
  profile_image_url_https:            string;
  profile_use_background_image:       boolean;
  listed_count:                       number;
  profile_text_color:                 string;
  protected:                          boolean;
  lang:                               null | string;
  followers_count:                    number;
  time_zone:                          null | string;
  profile_background_image_url_https: null | string;
  verified:                           boolean;
  profile_background_color:           string;
  notifications:                      boolean;
  description:                        string;
  geo_enabled:                        boolean;
  statuses_count:                     number;
  default_profile_image:              boolean;
  friends_count:                      number;
  profile_background_image_url:       null | string;
  show_all_inline_media?:             boolean;
  screen_name:                        string;
  following:                          boolean;
  is_translation_enabled?:            boolean;
  profile_banner_url?:                string;
  has_extended_profile?:              boolean;
  translator_type?:                   string;
}

export interface UserEntities {
  url?:        Description;
  description: Description;
}

export interface Description {
  urls: Url[];
}


//#endregion

// APIEndpoint: [[Array of possible body], [Array of possible response]]
interface PostResources {
  // Tweets - https://developer.twitter.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference
  'statuses/update': [[PostUpdateTweetBody], [Tweet]],
  'statuses/destroy': [[PostGeneralTweetBody], [Tweet]],
  'statuses/retweet': [[PostGeneralTweetBody], [Tweet]],
  'statuses/unretweet': [[PostGeneralTweetBody], [Tweet]],
  'favorites/create': [[], [Likes]],
  'favorites/destroy': [[], [Likes]],
  'statuses/update_with_media': [[], []], // Deprecated

  // TODO: Comeplete everything below

  // Friendships - https://developer.twitter.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference
  // Also known as following someone
  'friendships/create': [[], []],
  'friendships/destroy': [[], []],
  'friendships/update': [[], []],

  // Mute / Block - https://developer.twitter.com/en/docs/twitter-api/v1/accounts-and-users/mute-block-report-users/api-reference
  'blocks/create': [[], []],
  'blocks/destroy': [[], []],
  'mutes/users/create': [[], []],
  'mutes/users/destroy': [[], []],
  'users/report_spam': [[], []],

  // Lists - https://developer.twitter.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference
  'list/create': [[], []],
  'list/destroy': [[], []],
  'list/members/create': [[], []],
  'list/members/create_all': [[], []],
  'list/members/destroy': [[], []],
  'list/members/destroy_all': [[], []],
  'list/subscribers/delete': [[], []],
  'list/subscribers/destroy': [[], []],
  'list/update': [[], []],
}
