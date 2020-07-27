import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {updateChannelArgs} from '../fixtures/update-channel';
import {seed} from '../../../db/seeds/1_signing_wallet_seeds';
import {truncate} from '../../../db-admin/db-admin-connection';
import knex from '../../../db/connection';
import {stateWithHashSignedBy} from '../fixtures/states';
import {alice, bob} from '../fixtures/signingWallets';
import {channel} from '../../../models/__test__/fixtures/channel';
import {Bytes32} from '../../../type-aliases';

let w: Wallet;
let channelId: Bytes32;
beforeEach(async () => {
  await truncate(knex);
  w = new Wallet();
});

describe('happy path', () => {
  // Make sure alice's PK is in the DB
  beforeEach(async () => {
    await seed(knex);

    const c = channel({vars: [stateWithHashSignedBy(alice(), bob())({turnNum: 5})]});
    await Channel.query().insert(c);

    channelId = c.channelId;
  });

  it('updates a channel', async () => {
    const current = await Channel.forId(channelId, undefined);
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
      channelResults: [{channelId, turnNum: 6, appData}],
    });

    const updated = await Channel.forId(channelId, undefined);
    expect(updated.latest).toMatchObject({turnNum: 6, appData});
  });
});
