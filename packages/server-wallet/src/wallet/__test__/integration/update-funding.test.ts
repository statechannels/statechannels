import {BN} from '@statechannels/wallet-core';
import {ETH_ASSET_HOLDER_ADDRESS} from '@statechannels/wallet-core/lib/src/config';

import {channel} from '../../../models/__test__/fixtures/channel';
import {stateWithHashSignedBy} from '../fixtures/states';
import {Channel} from '../../../models/channel';
import {truncate} from '../../../db-admin/db-admin-connection';
import {Wallet} from '../..';
import knex from '../../../db/connection';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {alice, bob} from '../fixtures/signing-wallets';
import {Funding} from '../../../models/funding';

let w: Wallet;
beforeEach(async () => {
  await truncate(knex);
  w = new Wallet();
});

beforeEach(async () => await seedAlicesSigningWallet(knex));

it('sends the post fund setup when the funding event is provided', async () => {
  const c = channel({vars: [stateWithHashSignedBy(alice(), bob())({turnNum: 0})]});
  await Channel.query().insert(c);
  const {channelId} = c;
  const result = await w.updateChannelFunding({
    channelId: c.channelId,
    token: '0x00',
    amount: BN.from(4),
  });

  await expect(
    Funding.getFundingAmount(channelId, ETH_ASSET_HOLDER_ADDRESS, undefined)
  ).resolves.toEqual('0x04');

  expect(result).toMatchObject({
    outbox: [
      {
        params: {
          recipient: 'bob',
          sender: 'alice',
          data: {signedStates: [{turnNum: 3}]},
        },
      },
    ],
    channelResult: {channelId: c.channelId, turnNum: 0}, // The turnNum is coming from the supported state so we expect it be 0 still
  });
});
