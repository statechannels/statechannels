import { Wallet } from '../..';
import { message } from '../fixtures/messages';
import { stateSignedBy } from '../fixtures/states';
import { Channel } from '../../../models/channel';
import { addHash } from '../../../state-utils';
import { calculateChannelId } from '@statechannels/wallet-core';
import { alice, bob } from '../fixtures/signingWallets';
import { seed } from '../../../db/seeds/1_signing_wallet_seeds';
import knex from '../../../db/connection';
import { truncate } from '../../../db-admin/db-admin-connection';
beforeEach(async () => seed(knex));

it("doesn't throw on an empty message", () => {
  const wallet = new Wallet();

  return expect(wallet.pushMessage(message())).resolves.not.toThrow();
});

const two = 2;
const three = 3;
const five = 5;

it('stores states contained in the message, in a single channel model', async () => {
  const wallet = new Wallet();

  const channelsBefore = await Channel.query().select();
  expect(channelsBefore).toHaveLength(0);

  const signedStates = [
    stateSignedBy()({ turnNum: three }),
    stateSignedBy()({ turnNum: two }),
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
    stateSignedBy()({ turnNum: three }),
    stateSignedBy()({ turnNum: three, channelNonce: 567 }),
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
    message({
      signedStates: [stateSignedBy(alice(), bob())({ turnNum: three })],
    })
  );

  const afterFirst = await Channel.query().select();

  expect(afterFirst).toHaveLength(1);
  expect(afterFirst[0].vars).toHaveLength(1);
  expect(afterFirst[0].supported).toBeTruthy();
  expect(afterFirst[0].supported.turnNum).toEqual(three);

  await wallet.pushMessage(
    message({ signedStates: [stateSignedBy()({ turnNum: two })] })
  );

  const afterSecond = await Channel.query().select();
  expect(afterSecond[0].vars).toHaveLength(1);
  expect(afterSecond).toMatchObject(afterFirst);

  await wallet.pushMessage(
    message({ signedStates: [stateSignedBy()({ turnNum: five })] })
  );

  const afterThird = await Channel.query().select();
  expect(afterThird[0].vars).toHaveLength(2);
});

it("doesn't store states for unknown signing addresses", async () => {
  const wallet = new Wallet();
  await truncate(knex, ['signing_wallets']);

  return expect(
    wallet.pushMessage(
      message({
        signedStates: [stateSignedBy(alice(), bob())({ turnNum: three })],
      })
    )
  ).rejects.toThrow(Error('Not in channel'));
});
