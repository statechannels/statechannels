import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {truncate} from '../../../db-admin/db-admin-connection';
import knex from '../../../db/connection';
import {stateWithHashSignedBy} from '../fixtures/states';
import {alice, bob} from '../fixtures/signing-wallets';
import {channel} from '../../../models/__test__/fixtures/channel';

let w: Wallet;
beforeEach(async () => {
  await truncate(knex);
  w = new Wallet();
});

beforeEach(async () => seedAlicesSigningWallet(knex));

it("signs a final state when it's my turn", async () => {
  const appData = '0x0f00';
  const turnNum = 7;
  const runningState = {turnNum, appData};
  const closingState = {...runningState, isFinal: true, turnNum: turnNum + 1};
  const c = channel({vars: [stateWithHashSignedBy(alice(), bob())(runningState)]});
  await Channel.query().insert(c);

  const channelId = c.channelId;
  const current = await Channel.forId(channelId, undefined);
  expect(current.protocolState).toMatchObject({latest: runningState, supported: runningState});

  await expect(w.closeChannel({channelId})).resolves.toMatchObject({
    outbox: [{params: {recipient: 'bob', sender: 'alice', data: {signedStates: [closingState]}}}],
    channelResult: {channelId, status: 'closing', turnNum: turnNum + 1, appData},
  });

  const updated = await Channel.forId(channelId, undefined);
  expect(updated.protocolState).toMatchObject({latest: closingState, supported: closingState});
});

it("reject when it's not my turn", async () => {
  const appData = '0x0f00';
  const turnNum = 8;
  const runningState = {turnNum, appData};
  const c = channel({vars: [stateWithHashSignedBy(alice(), bob())(runningState)]});
  await Channel.query().insert(c);

  const channelId = c.channelId;

  await expect(w.closeChannel({channelId})).rejects.toMatchObject(new Error('not my turn'));

  const updated = await Channel.forId(channelId, undefined);
  expect(updated.protocolState).toMatchObject({latest: runningState, supported: runningState});
});
