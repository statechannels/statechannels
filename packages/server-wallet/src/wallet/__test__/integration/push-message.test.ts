import {calculateChannelId, simpleEthAllocation} from '@statechannels/wallet-core';
import {ChannelResult} from '@statechannels/client-api-schema';

import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {addHash} from '../../../state-utils';
import {alice, bob, charlie} from '../fixtures/signing-wallets';
import {alice as aliceP, bob as bobP, charlie as charlieP} from '../fixtures/participants';
import {message} from '../fixtures/messages';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {stateSignedBy} from '../fixtures/states';
import {truncate} from '../../../db-admin/db-admin-connection';
import {channel, withSupportedState} from '../../../models/__test__/fixtures/channel';
import {stateVars} from '../fixtures/state-vars';
import {defaultConfig} from '../../../config';

const wallet = new Wallet(defaultConfig);
afterAll(async () => {
  // tear down Wallet's db connection
  await wallet.knex.destroy();
});
beforeEach(async () => seedAlicesSigningWallet(wallet.knex));

it("doesn't throw on an empty message", () => {
  return expect(wallet.pushMessage(message())).resolves.not.toThrow();
});

const zero = 0;
const four = 4;
const five = 5;
const six = 6;

it('stores states contained in the message, in a single channel model', async () => {
  const channelsBefore = await Channel.query(wallet.knex).select();
  expect(channelsBefore).toHaveLength(0);

  const signedStates = [
    stateSignedBy([alice()])({turnNum: five}),
    stateSignedBy([alice(), bob()])({turnNum: four}),
  ];

  await wallet.pushMessage(message({signedStates}));

  const channelsAfter = await Channel.query(wallet.knex).select();

  expect(channelsAfter).toHaveLength(1);
  expect(channelsAfter[0].vars).toHaveLength(2);

  // The Channel model adds the state hash before persisting
  expect(signedStates.map(addHash)).toMatchObject(channelsAfter[0].vars);
});

const expectResults = async (
  p: Promise<{channelResults: ChannelResult[]}>,
  channelResults: Partial<ChannelResult>[]
): Promise<void> => {
  await expect(p.then(data => data.channelResults)).resolves.toHaveLength(channelResults.length);
  await expect(p).resolves.toMatchObject({channelResults});
};

describe('channel results', () => {
  it("returns a 'proposed' channel result when receiving the first state from a peer", async () => {
    const channelsBefore = await Channel.query(wallet.knex).select();
    expect(channelsBefore).toHaveLength(0);

    const signedStates = [stateSignedBy([bob()])({turnNum: zero})];

    await expectResults(wallet.pushMessage(message({signedStates})), [
      {turnNum: zero, status: 'proposed'},
    ]);
  });

  it("returns a 'running' channel result when receiving a state in a channel that is now running", async () => {
    const channelsBefore = await Channel.query(wallet.knex).select();
    expect(channelsBefore).toHaveLength(0);
    const {channelId} = await Channel.query(wallet.knex).insert(
      withSupportedState()({vars: [stateVars({turnNum: 8})]})
    );

    return expectResults(
      wallet.pushMessage(message({signedStates: [stateSignedBy([bob()])({turnNum: 9})]})),
      [{channelId, turnNum: 9, status: 'running'}]
    );
  });

  it("returns a 'closing' channel result when receiving a state in a channel that is now closing", async () => {
    const channelsBefore = await Channel.query(wallet.knex).select();
    expect(channelsBefore).toHaveLength(0);

    const participants = [aliceP(), bobP(), charlieP()];
    const vars = [stateVars({turnNum: 9})];
    const channel = withSupportedState([alice(), bob(), charlie()])({vars, participants});
    const {channelId} = await Channel.query(wallet.knex).insert(channel);

    const signedStates = [stateSignedBy([bob()])({turnNum: 10, isFinal: true, participants})];
    return expectResults(wallet.pushMessage(message({signedStates})), [
      {channelId, turnNum: 10, status: 'closing'},
    ]);
  });

  it("returns a 'closed' channel result when receiving a state in a channel that is now closed", async () => {
    const channelsBefore = await Channel.query(wallet.knex).select();
    expect(channelsBefore).toHaveLength(0);

    const signedStates = [stateSignedBy([alice(), bob()])({turnNum: 9, isFinal: true})];

    return expectResults(wallet.pushMessage(message({signedStates})), [
      {turnNum: 9, status: 'closed'},
    ]);
  });

  it('stores states for multiple channels', async () => {
    const channelsBefore = await Channel.query(wallet.knex).select();
    expect(channelsBefore).toHaveLength(0);

    const signedStates = [
      stateSignedBy([alice(), bob()])({turnNum: five}),
      stateSignedBy([alice(), bob()])({turnNum: six, channelNonce: 567, appData: '0x0f00'}),
    ];
    const p = wallet.pushMessage(message({signedStates}));

    await expectResults(p, [{turnNum: five}, {turnNum: six, appData: '0x0f00'}]);

    const channelsAfter = await Channel.query(wallet.knex).select();

    expect(channelsAfter).toHaveLength(2);
    expect(channelsAfter[0].vars).toHaveLength(1);

    // The Channel model adds the state hash before persisting

    const stateVar = signedStates.map(addHash)[1];
    const record = await Channel.forId(calculateChannelId(stateVar), wallet.knex);

    expect(stateVar).toMatchObject(record.vars[0]);
  });
});

it("Doesn't store stale states", async () => {
  const channelsBefore = await Channel.query(wallet.knex).select();
  expect(channelsBefore).toHaveLength(0);

  const signedStates = [stateSignedBy([alice(), bob()])({turnNum: five})];
  await wallet.pushMessage(message({signedStates}));

  const afterFirst = await Channel.query(wallet.knex).select();

  expect(afterFirst).toHaveLength(1);
  expect(afterFirst[0].vars).toHaveLength(1);
  expect(afterFirst[0].supported).toBeTruthy();
  expect(afterFirst[0].supported?.turnNum).toEqual(five);

  await wallet.pushMessage(message({signedStates: [stateSignedBy()({turnNum: four})]}));

  const afterSecond = await Channel.query(wallet.knex).select();
  expect(afterSecond[0].vars).toHaveLength(1);
  expect(afterSecond).toMatchObject(afterFirst);

  await wallet.pushMessage(message({signedStates: [stateSignedBy()({turnNum: six})]}));

  const afterThird = await Channel.query(wallet.knex).select();
  expect(afterThird[0].vars).toHaveLength(2);
});

it("doesn't store states for unknown signing addresses", async () => {
  await truncate(wallet.knex, ['signing_wallets']);

  const signedStates = [stateSignedBy([alice(), bob()])({turnNum: five})];
  return expect(wallet.pushMessage(message({signedStates}))).rejects.toThrow(
    Error('Not in channel')
  );
});

describe('when the application protocol returns an action', () => {
  it('signs the postfund setup when the prefund setup is supported', async () => {
    const state = stateSignedBy()({outcome: simpleEthAllocation([])});

    const c = channel({vars: [addHash(state)]});
    await Channel.query(wallet.knex).insert(c);

    expect(c.latestSignedByMe?.turnNum).toEqual(0);
    expect(c.supported).toBeUndefined();
    const {channelId} = c;

    const p = wallet.pushMessage(message({signedStates: [stateSignedBy([bob()])(state)]}));
    await expectResults(p, [{channelId, status: 'opening'}]);
    await expect(p).resolves.toMatchObject({
      outbox: [{method: 'MessageQueued', params: {data: {signedStates: [{turnNum: 3}]}}}],
    });

    const updatedC = await Channel.forId(channelId, wallet.knex);
    expect(updatedC.protocolState).toMatchObject({
      latestSignedByMe: {turnNum: 3},
      supported: {turnNum: 0},
    });
  });

  it('forms a conclusion proof when the peer wishes to close the channel', async () => {
    const turnNum = 6;
    const state = stateSignedBy()({outcome: simpleEthAllocation([]), turnNum});

    const c = channel({vars: [addHash(state)]});
    await Channel.query(wallet.knex).insert(c);

    const {channelId} = c;

    const finalState = {...state, isFinal: true, turnNum: turnNum + 1};
    const p = wallet.pushMessage(message({signedStates: [stateSignedBy([bob()])(finalState)]}));
    await expectResults(p, [{channelId, status: 'closed'}]);
    await expect(p).resolves.toMatchObject({
      outbox: [
        {
          method: 'MessageQueued',
          params: {data: {signedStates: [{turnNum: turnNum + 1, isFinal: true}]}},
        },
      ],
    });

    const updatedC = await Channel.forId(channelId, wallet.knex);
    expect(updatedC.protocolState).toMatchObject({
      latestSignedByMe: {turnNum: turnNum + 1},
      supported: {turnNum: turnNum + 1},
    });
  });
});

describe('when there is a request provided', () => {
  it('has nothing in the outbox if there is no request added', async () => {
    await expect(wallet.pushMessage(message({requests: []}))).resolves.toMatchObject({
      outbox: [],
    });
  });

  it('appends message with single state to the outbox satisfying a GetChannel request', async () => {
    // Set up test by adding a single state into the DB via pushMessage call
    const channelsBefore = await Channel.query(wallet.knex).select();
    expect(channelsBefore).toHaveLength(0);
    const signedStates = [stateSignedBy([bob()])({turnNum: zero})];
    await wallet.pushMessage(message({signedStates}));

    // Get the channelId of that which was added
    const [{channelId}] = await Channel.query(wallet.knex).select();

    // Expect a GetChannel request to produce an outbound message with all states
    await expect(
      wallet.pushMessage(message({requests: [{type: 'GetChannel', channelId}]}))
    ).resolves.toMatchObject({
      outbox: [
        {
          method: 'MessageQueued',
          params: {data: {signedStates}},
        },
      ],
    });
  });

  it('appends message with multiple states to the outbox satisfying a GetChannel request', async () => {
    const channelsBefore = await Channel.query(wallet.knex).select();
    expect(channelsBefore).toHaveLength(0);

    const signedStates = [
      stateSignedBy([alice()])({turnNum: five}),
      stateSignedBy([alice(), bob()])({turnNum: four}),
    ];

    await wallet.pushMessage(message({signedStates}));

    // Get the channelId of that which was added
    const [{channelId}] = await Channel.query(wallet.knex).select();

    // Expect a GetChannel request to produce an outbound message with all states
    await expect(
      wallet.pushMessage(message({requests: [{type: 'GetChannel', channelId}]}))
    ).resolves.toMatchObject({
      outbox: [
        {
          method: 'MessageQueued',
          params: {data: {signedStates}},
        },
      ],
    });
  });
});
