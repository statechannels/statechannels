import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {updateChannelArgs} from '../fixtures/update-channel';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {truncate} from '../../../db-admin/db-admin-connection';
import {stateWithHashSignedBy} from '../fixtures/states';
import {alice, bob} from '../fixtures/signing-wallets';
import {channel} from '../../../models/__test__/fixtures/channel';
import {defaultConfig} from '../../../config';
import {testKnex as knex} from '../../../../jest/knex-setup-teardown';
let w: Wallet;
beforeEach(async () => {
  await truncate(knex);
  w = new Wallet(defaultConfig);
});
afterEach(async () => {
  await w.knex.destroy();
});

beforeEach(async () => await seedAlicesSigningWallet(knex));

it('updates a channel', async () => {
  const c = channel({vars: [stateWithHashSignedBy(alice(), bob())({turnNum: 5})]});
  await Channel.query(w.knex).insert(c);

  const channelId = c.channelId;
  const current = await Channel.forId(channelId, knex);
  expect(current.latest).toMatchObject({turnNum: 5, appData: '0x'});

  const appData = '0xa00f00';
  await expect(w.updateChannel(updateChannelArgs({appData}))).resolves.toMatchObject({
    outbox: [
      {
        params: {
          recipient: 'bob',
          sender: 'alice',
          data: {signedStates: [{turnNum: 6, appData}]},
        },
      },
    ],
    channelResult: {channelId, turnNum: 6, appData},
  });

  const updated = await Channel.forId(channelId, knex);
  expect(updated.latest).toMatchObject({turnNum: 6, appData});
});

describe('error cases', () => {
  it('throws when it is not my turn', async () => {
    const c = channel({vars: [stateWithHashSignedBy(alice(), bob())({turnNum: 4})]});
    await Channel.query(w.knex).insert(c);

    await expect(w.updateChannel(updateChannelArgs())).rejects.toMatchObject(
      Error('it is not my turn')
    );
  });

  it("throws when the channel isn't found", async () => {
    await expect(w.updateChannel(updateChannelArgs())).rejects.toMatchObject(
      Error('channel not found')
    );
  });
});
