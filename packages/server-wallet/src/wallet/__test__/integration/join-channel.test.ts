import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {seed} from '../../../db/seeds/1_signing_wallet_seeds';
import {truncate} from '../../../db-admin/db-admin-connection';
import knex from '../../../db/connection';
import {stateWithHashSignedBy} from '../fixtures/states';
import {bob} from '../fixtures/signing-wallets';
import {channel} from '../../../models/__test__/fixtures/channel';

let w: Wallet;
beforeEach(async () => {
  await truncate(knex);
  w = new Wallet();
});

// Make sure alice's PK is in the DB
beforeEach(async () => {
  await seed(knex);
});

it('signs the prefund setup', async () => {
  const appData = '0xf00';
  const preFS = {turnNum: 0, appData};
  const c = channel({vars: [stateWithHashSignedBy(bob())(preFS)]});
  await Channel.query().insert(c);

  const channelId = c.channelId;
  const current = await Channel.forId(channelId, undefined);
  expect(current.latest).toMatchObject(preFS);

  await expect(w.joinChannel({channelId})).resolves.toMatchObject({
    outbox: [
      {
        params: {
          recipient: 'bob',
          sender: 'alice',
          data: {signedStates: [{turnNum: 0, appData}]},
        },
      },
    ],
    channelResults: [{channelId, turnNum: 0, appData, status: 'funding'}],
  });

  const updated = await Channel.forId(channelId, undefined);
  expect(updated).toMatchObject({latest: preFS, supported: preFS});
});
