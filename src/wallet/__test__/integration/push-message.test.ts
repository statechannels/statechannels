import { Wallet } from '../..';
import { message } from '../fixtures/messages';
import { stateSignedBy } from '../fixtures/states';
import { Channel } from '../../../models/channel';
import { addHash } from '../../../state-utils';
import { calculateChannelId } from '@statechannels/wallet-core';
import { alice, bob } from '../fixtures/signingWallets';
import { seed } from '../../../db/seeds/1_signing_wallet_seeds';
import knex from '../../../db/connection';
beforeEach(async () => seed(knex));

it("doesn't throw on an empty message", () => {
  const wallet = new Wallet();

  return expect(wallet.pushMessage(message())).resolves.not.toThrow();
});

it('stores states contained in the message, in a single channel model', async () => {
  const wallet = new Wallet();

  const channelsBefore = await Channel.query().select();
  expect(channelsBefore).toHaveLength(0);

  const signedStates = [
    stateSignedBy()({ turnNum: 3 }),
    stateSignedBy()({ turnNum: 2 }),
  ];

  await wallet.pushMessage(message({ signedStates: signedStates }));

  const channelsAfter = await Channel.query().select();

  expect(channelsAfter).toHaveLength(1);
  expect(channelsAfter[0].vars).toHaveLength(2);

  // The Channel model adds the state hash before persisting
  expect(signedStates.map(addHash)).toMatchObject(channelsAfter[0].vars);
});

it('stores states for multiple channels', async () => {
  const wallet = new Wallet();

  const channelsBefore = await Channel.query().select();
  expect(channelsBefore).toHaveLength(0);

  const signedStates = [
    stateSignedBy()({ turnNum: 2 }),
    stateSignedBy()({ turnNum: 2, channelNonce: 567 }),
  ];
  await wallet.pushMessage(message({ signedStates: signedStates }));

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

it("Doesn't store stale states", async () => {
  const wallet = new Wallet();

  const channelsBefore = await Channel.query().select();
  expect(channelsBefore).toHaveLength(0);

  await wallet.pushMessage(
    message({ signedStates: [stateSignedBy(alice(), bob())({ turnNum: 5 })] })
  );

  const afterFirst = await Channel.query().select();

  expect(afterFirst).toHaveLength(1);
  expect(afterFirst[0].vars).toHaveLength(1);
  expect(afterFirst[0].supported).toBeTruthy();
  expect(afterFirst[0].supported.turnNum).toEqual(5);

  await wallet.pushMessage(
    message({ signedStates: [stateSignedBy(bob())({ turnNum: 3 })] })
  );

  const afterSecond = await Channel.query().select();
  expect(afterSecond[0].vars).toHaveLength(1);
  expect(afterSecond).toMatchObject(afterFirst);

  await wallet.pushMessage(
    message({ signedStates: [stateSignedBy(bob())({ turnNum: 6 })] })
  );

  const afterThird = await Channel.query().select();
  expect(afterThird[0].vars).toHaveLength(2);
});

it("doesn't store states for unknown signing addresses", async () => {
  const wallet = new Wallet();
  await knex('signing_wallets').delete();

  return expect(
    wallet.pushMessage(
      message({ signedStates: [stateSignedBy(alice(), bob())({ turnNum: 5 })] })
    )
  ).rejects.toThrow(Error('Not in channel'));
});
