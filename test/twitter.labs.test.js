require('dotenv').config();
const Twitter = require('../twitter');

const {
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
  ACCESS_TOKEN,
  ACCESS_TOKEN_SECRET,
} = process.env;

function newClient() {
  return new Twitter({
    consumer_key: TWITTER_CONSUMER_KEY,
    consumer_secret: TWITTER_CONSUMER_SECRET,
    access_token_key: ACCESS_TOKEN,
    access_token_secret: ACCESS_TOKEN_SECRET,
  });
}


describe('LABS - creating with labs', () => {
  let client;
  let clientWithLabs;
  beforeAll(() => {
    client = newClient();
    clientWithLabs = client.withLabs();
  });

  it('should create object with all twitter functions', () => {
    for (const funcName of Object.getOwnPropertyNames(Twitter.prototype)) {
      expect(clientWithLabs[funcName]).toBeDefined();
      expect(clientWithLabs[funcName]).toBeInstanceOf(Function);
    }
  });

  it('should create object with all twitter properties', () => {
    for (const propertyName of Object.getOwnPropertyNames(client)) {
      expect(clientWithLabs[propertyName]).toBeDefined();
      expect(clientWithLabs[propertyName]);
    }
  });
});

describe('LABS - filter stream labs', () => {
  let clientWithLabs;
  let addedRules;
  let addedRulesId;

  // create labs instance and add initial rules
  beforeAll(async () => {
    const bearerToken = await newClient().getBearerToken();
    clientWithLabs = new Twitter({ bearer_token: bearerToken.access_token }).withLabs();
    const rulesToAdd = [
      Twitter.labsFilterStreamRule('twitter'),
      Twitter.labsFilterStreamRule('testing'),
      Twitter.labsFilterStreamRule('hello'),
    ];
    const response = await clientWithLabs.addRules(rulesToAdd);
    addedRules = response.data;
    addedRulesId = response.data.map(d => d.id);
  });

  // delete initialized rules
  afterAll(async () => {
    await clientWithLabs.deleteRules(addedRulesId);
  });

  it('should create new rules when adding non-existent rules', async () => {
    const rulesToAdd = [Twitter.labsFilterStreamRule('random1'), Twitter.labsFilterStreamRule('random2')];
    const addRulesResponse = await clientWithLabs.addRules(rulesToAdd, true);

    expect(addRulesResponse).toMatchObject({
      data: [
        { value: 'random1', id: expect.any(String) },
        { value: 'random2', id: expect.any(String) },
      ],
      meta: {
        summary: {
          created: 2,
        },
      },
    });
  });

  it('should not create new rules when adding existing rules', async () => {
    const rulesToAdd = [Twitter.labsFilterStreamRule('twitter'), Twitter.labsFilterStreamRule('testing')];
    const addRulesResponse = await clientWithLabs.addRules(rulesToAdd, true);

    expect(addRulesResponse).toMatchObject({
      meta: {
        summary: {
          created: 0,
        },
      },
    });
  });

  it('should delete rules that exist', async () => {
    const deleteRulesResponse = await clientWithLabs.deleteRules(addedRulesId, true);

    expect(deleteRulesResponse).toMatchObject({
      meta: {
        summary: {
          deleted: addedRulesId.length,
        },
      },
    });
  });

  it('should be an error when deleting rules that does not exist', async () => {
    const deleteRulesResponse = await clientWithLabs.deleteRules(['239197139192', '28319317192'], true);

    expect(deleteRulesResponse).toMatchObject({
      meta: {
        summary: {
          deleted: 0,
          not_deleted: 2,
        },
      }, errors: [
        { errors: [{ message: 'Rule does not exist', parameters: {} }] },
        { errors: [{ message: 'Rule does not exist', parameters: {} }] },
      ],
    });
  });

  it('should get all currently available rules when no IDs are given', async () => {
    const getRulesResponse = await clientWithLabs.getRules();
    expect(getRulesResponse.data).toBeDefined();
    expect(getRulesResponse.data).toContainEqual(...addedRules);
  });

  it('should get only specified rules when IDs are given', async () => {
    const getRulesResponse = await clientWithLabs.getRules(addedRulesId.slice(0, 2));
    expect(getRulesResponse.data).toBeDefined();
    expect(getRulesResponse.data).toHaveLength(2);
    expect(getRulesResponse.data).toContainEqual(...addedRules.slice(0, 2));
    expect(getRulesResponse.data).not.toContainEqual(addedRules[2]);
  });

});
