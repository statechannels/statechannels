import {BN, makeAddress} from '@statechannels/wallet-core';
import {ethers} from 'ethers';

import {channel} from '../../../models/__test__/fixtures/channel';
import {stateWithHashSignedBy} from '../fixtures/states';
import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {alice, bob} from '../fixtures/signing-wallets';
import {Funding} from '../../../models/funding';
import {ObjectiveModel} from '../../../models/objective';
import {defaultTestConfig} from '../../../config';
import {DBAdmin} from '../../../db-admin/db-admin';
import {getChannelResultFor, getSignedStateFor} from '../../../__test__/test-helpers';

const AddressZero = makeAddress(ethers.constants.AddressZero);

let w: Wallet;
beforeEach(async () => {
  w = Wallet.create(defaultTestConfig);
  await new DBAdmin(w.knex).truncateDB();
});
afterEach(async () => {
  await w.destroy();
});

beforeEach(async () => await seedAlicesSigningWallet(w.knex));

it('sends the post fund setup when the funding event is provided for multiple channels', async () => {
  const c1 = channel({
    channelNonce: 1,
    vars: [
      stateWithHashSignedBy([alice()])({turnNum: 0, channelNonce: 1}),
      stateWithHashSignedBy([bob()])({turnNum: 1, channelNonce: 1}),
    ],
  });
  const c2 = channel({
    channelNonce: 2,
    vars: [
      stateWithHashSignedBy([alice()])({turnNum: 0, channelNonce: 2}),
      stateWithHashSignedBy([bob()])({turnNum: 1, channelNonce: 2}),
    ],
  });
  await Channel.query(w.knex).insert(c1);
  await Channel.query(w.knex).insert(c2);
  const channelIds = [c1, c2].map(c => c.channelId);

  await ObjectiveModel.insert(
    {
      type: 'OpenChannel',
      participants: c1.participants,
      data: {
        targetChannelId: c1.channelId,
        fundingStrategy: 'Direct',
        role: 'app',
      },
      status: 'approved',
    },
    w.knex
  );

  await ObjectiveModel.insert(
    {
      type: 'OpenChannel',
      participants: c2.participants,
      data: {
        targetChannelId: c2.channelId,
        fundingStrategy: 'Direct',
        role: 'app',
      },
      status: 'approved',
    },
    w.knex
  );

  const {outbox, channelResults} = await w.updateFundingForChannels(
    channelIds.map(cId => ({
      channelId: cId,
      token: '0x00',
      amount: BN.from(4),
    }))
  );

  await expect(Funding.getFundingAmount(w.knex, c1.channelId, AddressZero)).resolves.toEqual(
    '0x04'
  );

  await expect(Funding.getFundingAmount(w.knex, c2.channelId, AddressZero)).resolves.toEqual(
    '0x04'
  );

  expect(getChannelResultFor(channelIds[0], channelResults)).toMatchObject({
    turnNum: 2,
  });

  expect(getChannelResultFor(channelIds[1], channelResults)).toMatchObject({
    turnNum: 2,
  });

  expect(getSignedStateFor(channelIds[0], outbox)).toMatchObject({
    turnNum: 2,
    channelNonce: 1,
  });

  expect(getSignedStateFor(channelIds[1], outbox)).toMatchObject({
    turnNum: 2,
    channelNonce: 2,
  });
});

it('sends the post fund setup when the funding event is provided', async () => {
  const c = channel({
    vars: [
      stateWithHashSignedBy([alice()])({turnNum: 0}),
      stateWithHashSignedBy([bob()])({turnNum: 1}),
    ],
  });
  await Channel.query(w.knex).insert(c);
  const {channelId} = c;

  await ObjectiveModel.insert(
    {
      type: 'OpenChannel',
      participants: c.participants,
      data: {
        targetChannelId: c.channelId,
        fundingStrategy: 'Direct',
        role: 'app',
      },
      status: 'approved',
    },
    w.knex
  );

  const result = await w.updateFundingForChannels([
    {
      channelId: c.channelId,
      token: '0x00',
      amount: BN.from(4),
    },
  ]);

  await expect(Funding.getFundingAmount(w.knex, channelId, AddressZero)).resolves.toEqual('0x04');

  expect(result).toMatchObject({
    outbox: [
      {
        params: {
          recipient: 'bob',
          sender: 'alice',
          data: {signedStates: [{turnNum: 2}]},
        },
      },
    ],
    channelResults: [{channelId: c.channelId, turnNum: 2}],
  });
});
