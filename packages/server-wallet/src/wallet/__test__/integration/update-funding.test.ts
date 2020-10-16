import {BN} from '@statechannels/wallet-core';
import {ethers} from 'ethers';

import {channel} from '../../../models/__test__/fixtures/channel';
import {stateWithHashSignedBy} from '../fixtures/states';
import {Channel} from '../../../models/channel';
import {truncate} from '../../../db-admin/db-admin-connection';
import {Wallet} from '../..';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {alice, bob} from '../fixtures/signing-wallets';
import {Funding} from '../../../models/funding';
import {defaultConfig} from '../../../config';
import {OpenChannelObjective} from '../../../models/open-channel-objective';

const {AddressZero} = ethers.constants;

let w: Wallet;
beforeEach(async () => {
  w = new Wallet(defaultConfig);
  await truncate(w.knex);
});
afterEach(async () => {
  await w.destroy();
});

beforeEach(async () => await seedAlicesSigningWallet(w.knex));

it('sends the post fund setup when the funding event is provided for multiple channels', async () => {
  const c1 = channel({
    channelNonce: 1,
    vars: [stateWithHashSignedBy(alice(), bob())({turnNum: 0, channelNonce: 1})],
  });
  const c2 = channel({
    channelNonce: 2,
    vars: [stateWithHashSignedBy(alice(), bob())({turnNum: 0, channelNonce: 2})],
  });
  await Channel.query(w.knex).insert(c1);
  await Channel.query(w.knex).insert(c2);
  const channelIds = [c1, c2].map(c => c.channelId);

  await OpenChannelObjective.insert(
    {
      type: 'OpenChannel',
      participants: c1.participants,
      data: {
        targetChannelId: c1.channelId,
        fundingStrategy: 'Direct',
      },
      status: 'approved',
      objectiveId: c1.channelNonce,
    },
    w.knex
  );

  await OpenChannelObjective.insert(
    {
      type: 'OpenChannel',
      participants: c2.participants,
      data: {
        targetChannelId: c2.channelId,
        fundingStrategy: 'Direct',
      },
      status: 'approved',
      objectiveId: c2.channelNonce,
    },
    w.knex
  );

  const result = await w.updateFundingForChannels(
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

  expect(result).toMatchObject({
    outbox: [
      {
        params: {
          recipient: 'bob',
          sender: 'alice',
          data: {
            signedStates: [
              {turnNum: 2, channelNonce: 1},
              {turnNum: 2, channelNonce: 2},
            ],
          },
        },
      },
    ],
    channelResults: channelIds.map(cId => ({channelId: cId, turnNum: 0})),
  });
});

it('sends the post fund setup when the funding event is provided', async () => {
  const c = channel({vars: [stateWithHashSignedBy(alice(), bob())({turnNum: 0})]});
  await Channel.query(w.knex).insert(c);
  const {channelId} = c;

  await OpenChannelObjective.insert(
    {
      type: 'OpenChannel',
      participants: c.participants,
      data: {
        targetChannelId: c.channelId,
        fundingStrategy: 'Direct',
      },
      status: 'approved',
      objectiveId: c.channelNonce,
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
    channelResults: [{channelId: c.channelId, turnNum: 0}], // The turnNum is coming from the supported state so we expect it be 0 still
  });
});
