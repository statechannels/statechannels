import {simpleEthAllocation} from '@statechannels/wallet-core';

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

it('signs the prefund setup ', async () => {
  const appData = '0xf00';
  const preFS = {turnNum: 0, appData};
  const c = channel({vars: [stateWithHashSignedBy(bob())(preFS)]});
  await Channel.query().insert(c);

  const channelId = c.channelId;
  const current = await Channel.forId(channelId, undefined);
  expect(current.latest).toMatchObject(preFS);

  await expect(w.joinChannel({channelId})).resolves.toMatchObject({
    outbox: [{params: {recipient: 'bob', sender: 'alice', data: {signedStates: [preFS]}}}],
    // channelResults: [{channelId, turnNum: 0, appData, status: 'funding'}],
  });

  const updated = await Channel.forId(channelId, undefined);
  expect(updated).toMatchObject({latest: preFS, supported: preFS});
});

// There are no deposits to make --
it('signs the prefund setup and postfund setup, when there are no deposits to make', async () => {
  const outcome = simpleEthAllocation([]);
  const preFS = {turnNum: 0, outcome};
  const postFS = {turnNum: 3, outcome};
  const fix = stateWithHashSignedBy(bob());
  const c = channel({vars: [fix(preFS)]});
  await Channel.query().insert(c);

  const channelId = c.channelId;
  const current = await Channel.forId(channelId, undefined);
  expect(current.latest).toMatchObject(preFS);

  await expect(w.joinChannel({channelId})).resolves.toMatchObject({
    // TODO: These outbox items should probably be merged into one outgoing message
    outbox: [
      {params: {recipient: 'bob', sender: 'alice', data: {signedStates: [preFS]}}},
      {params: {recipient: 'bob', sender: 'alice', data: {signedStates: [postFS]}}},
    ],
    // TODO: channelResults is not calculated correctly: see the Channel model's channelResult
    // implementation
    // channelResults: [{channelId, turnNum: 3, outcome, status: 'funding'}],
  });

  const updated = await Channel.forId(channelId, undefined);
  expect(updated.protocolState).toMatchObject({latest: postFS, supported: preFS});
});
