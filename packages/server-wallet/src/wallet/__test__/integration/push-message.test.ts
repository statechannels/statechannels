import {calculateChannelId, simpleEthAllocation} from '@statechannels/wallet-core';
import {ChannelResult} from '@statechannels/client-api-schema';

import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {addHash} from '../../../state-utils';
import {alice, bob} from '../fixtures/signing-wallets';
import {message} from '../fixtures/messages';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {stateSignedBy} from '../fixtures/states';
import {truncate} from '../../../db-admin/db-admin-connection';
import knex from '../../../db/connection';
import {channel, withSupportedState} from '../../../models/__test__/fixtures/channel';

beforeEach(async () => seedAlicesSigningWallet(knex));

it("doesn't throw on an empty message", () => {
  return expect(wallet.pushMessage(message())).resolves.not.toThrow();
});

const zero = 0;
const four = 4;
const five = 5;
const six = 6;

const wallet = new Wallet();

it('stores states contained in the message, in a single channel model', async () => {
  const channelsBefore = await Channel.query().select();
  expect(channelsBefore).toHaveLength(0);

  const signedStates = [
    stateSignedBy(alice())({turnNum: five}),
    stateSignedBy(alice(), bob())({turnNum: four}),
  ];

  await wallet.pushMessage(message({signedStates}));

  const channelsAfter = await Channel.query().select();

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
    const channelsBefore = await Channel.query().select();
    expect(channelsBefore).toHaveLength(0);

    const signedStates = [stateSignedBy(bob())({turnNum: zero})];

    await expectResults(wallet.pushMessage(message({signedStates})), [
      {turnNum: zero, status: 'proposed'},
    ]);
  });

  it("returns a 'running' channel result when receiving a state in a channel that is now running", async () => {
    const channelsBefore = await Channel.query().select();
    expect(channelsBefore).toHaveLength(0);
    const {channelId} = await Channel.query().insert(withSupportedState({turnNum: 8})());

    return expectResults(
      wallet.pushMessage(message({signedStates: [stateSignedBy(bob())({turnNum: 9})]})),
      [{channelId, turnNum: 9, status: 'running'}]
    );
  });

  it("returns a 'closing' channel result when receiving a state in a channel that is now closing", async () => {
    const channelsBefore = await Channel.query().select();
    expect(channelsBefore).toHaveLength(0);
    const {channelId} = await Channel.query().insert(withSupportedState({turnNum: 8})());

    const signedStates = [stateSignedBy(bob())({turnNum: 9, isFinal: true})];

    return expectResults(wallet.pushMessage(message({signedStates})), [
      {channelId, turnNum: 9, status: 'closing'},
    ]);
  });

  it("returns a 'closing' channel result when receiving a state in a channel that is now closed", async () => {
    const channelsBefore = await Channel.query().select();
    expect(channelsBefore).toHaveLength(0);

    const signedStates = [stateSignedBy(alice(), bob())({turnNum: 9, isFinal: true})];

    return expectResults(wallet.pushMessage(message({signedStates})), [
      {turnNum: 9, status: 'closed'},
    ]);
  });

  it('stores states for multiple channels', async () => {
    const channelsBefore = await Channel.query().select();
    expect(channelsBefore).toHaveLength(0);

    const signedStates = [
      stateSignedBy(alice(), bob())({turnNum: five}),
      stateSignedBy(alice(), bob())({turnNum: six, channelNonce: 567, appData: '0xf00'}),
    ];
    const p = wallet.pushMessage(message({signedStates}));

    await expectResults(p, [{turnNum: five}, {turnNum: six, appData: '0xf00'}]);

    const channelsAfter = await Channel.query().select();

    expect(channelsAfter).toHaveLength(2);
    expect(channelsAfter[0].vars).toHaveLength(1);

    // The Channel model adds the state hash before persisting

    const stateVar = signedStates.map(addHash)[1];
    const record = await Channel.query()
      .where('channelId', calculateChannelId(stateVar))
      .first();

    expect(stateVar).toMatchObject(record.vars[0]);
  });
});

it("Doesn't store stale states", async () => {
  const channelsBefore = await Channel.query().select();
  expect(channelsBefore).toHaveLength(0);

  await wallet.pushMessage(
    message({
      signedStates: [stateSignedBy(alice(), bob())({turnNum: five})],
    })
  );

  const afterFirst = await Channel.query().select();

  expect(afterFirst).toHaveLength(1);
  expect(afterFirst[0].vars).toHaveLength(1);
  expect(afterFirst[0].supported).toBeTruthy();
  expect(afterFirst[0].supported?.turnNum).toEqual(five);

  await wallet.pushMessage(message({signedStates: [stateSignedBy()({turnNum: four})]}));

  const afterSecond = await Channel.query().select();
  expect(afterSecond[0].vars).toHaveLength(1);
  expect(afterSecond).toMatchObject(afterFirst);

  await wallet.pushMessage(message({signedStates: [stateSignedBy()({turnNum: six})]}));

  const afterThird = await Channel.query().select();
  expect(afterThird[0].vars).toHaveLength(2);
});

it("doesn't store states for unknown signing addresses", async () => {
  await truncate(knex, ['signing_wallets']);

  return expect(
    wallet.pushMessage(
      message({
        signedStates: [stateSignedBy(alice(), bob())({turnNum: five})],
      })
    )
  ).rejects.toThrow(Error('Not in channel'));
});

it('takes the next action, when the application protocol returns an action', async () => {
  const state = stateSignedBy()({outcome: simpleEthAllocation([])});

  const c = channel({vars: [addHash(state)]});
  await Channel.query().insert(c);

  expect(c.latestSignedByMe?.turnNum).toEqual(0);
  expect(c.supported).toBeUndefined();
  const {channelId} = c;

  const p = wallet.pushMessage(message({signedStates: [stateSignedBy(bob())(state)]}));
  await expectResults(p, [{channelId, status: 'opening'}]);
  await expect(p).resolves.toMatchObject({
    outbox: [{method: 'MessageQueued', params: {data: {signedStates: [{turnNum: 3}]}}}],
  });

  const updatedC = await Channel.forId(channelId, undefined);
  expect(updatedC.protocolState).toMatchObject({
    latestSignedByMe: {turnNum: 3},
    supported: {turnNum: 0},
  });
});
