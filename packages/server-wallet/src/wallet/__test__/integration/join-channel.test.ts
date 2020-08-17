import {simpleEthAllocation, BN} from '@statechannels/wallet-core';

import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {truncate} from '../../../db-admin/db-admin-connection';
import knex from '../../../db/connection';
import {stateWithHashSignedBy} from '../fixtures/states';
import {bob} from '../fixtures/signing-wallets';
import {channel} from '../../../models/__test__/fixtures/channel';
import {alice} from '../fixtures/participants';

let w: Wallet;
beforeEach(async () => {
  await truncate(knex);
  w = new Wallet();
});

beforeEach(async () => seedAlicesSigningWallet(knex));

describe('directly funded app', () => {
  it('signs the prefund setup ', async () => {
    const appData = '0xf00';
    const preFS = {turnNum: 0, appData};
    const postFS = {turnNum: 3, appData};
    const c = channel({vars: [stateWithHashSignedBy(bob())(preFS)]});
    await Channel.query().insert(c);

    const channelId = c.channelId;
    const current = await Channel.forId(channelId, undefined);
    expect(current.protocolState).toMatchObject({latest: preFS, supported: undefined});

    await expect(w.joinChannel({channelId})).resolves.toMatchObject({
      outbox: [
        {params: {recipient: 'bob', sender: 'alice', data: {signedStates: [preFS]}}},
        {params: {recipient: 'bob', sender: 'alice', data: {signedStates: [postFS]}}},
      ],
      // channelResults: [{channelId, turnNum: 0, appData, status: 'funding'}],
    });

    const updated = await Channel.forId(channelId, undefined);
    expect(updated.protocolState).toMatchObject({latest: postFS, supported: preFS});
  });

  it('signs the prefund setup and postfund setup, when there are no deposits to make', async () => {
    const outcome = simpleEthAllocation([]);
    const preFS = {turnNum: 0, outcome};
    const postFS = {turnNum: 3, outcome};
    const c = channel({vars: [stateWithHashSignedBy(bob())(preFS)]});
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

  it.skip('signs the prefund setup and makes a deposit, when I am first to deposit in a directly funded app', async () => {
    const outcome = simpleEthAllocation([{destination: alice().destination, amount: BN.from(5)}]);
    const preFS = {turnNum: 0, outcome};
    const c = channel({vars: [stateWithHashSignedBy(bob())(preFS)]});
    await Channel.query().insert(c);

    const channelId = c.channelId;
    const current = await Channel.forId(channelId, undefined);
    expect(current.latest).toMatchObject(preFS);

    const data = {signedStates: [preFS]};
    await expect(w.joinChannel({channelId})).resolves.toMatchObject({
      outbox: [
        {method: 'MessageQueued', params: {recipient: 'bob', sender: 'alice', data}},
        // TODO: It is unclear who will be responsible for making the deposit.
        // If the client does, we should expect this. If not,
        {method: 'SubmitTX', params: {transaction: expect.any(Object)}},
      ],
      // TODO: channelResults is not calculated correctly: see the Channel model's channelResult
      // implementation
      // channelResults: [{channelId, turnNum: 3, outcome, status: 'funding'}],
    });

    const updated = await Channel.forId(channelId, undefined);
    expect(updated.protocolState).toMatchObject({latest: preFS, supported: preFS});
  });
});

describe('virtually funded app', () => {
  it.skip('signs the prefund setup and messages the hub', async () => {
    const outcome = simpleEthAllocation([{destination: alice().destination, amount: BN.from(5)}]);
    const preFS = {turnNum: 0, outcome};
    const c = channel({vars: [stateWithHashSignedBy(bob())(preFS)]});
    await Channel.query().insert(c);

    const channelId = c.channelId;
    const current = await Channel.forId(channelId, undefined);
    expect(current.latest).toMatchObject(preFS);

    const data = {signedStates: [preFS]};
    await expect(w.joinChannel({channelId})).resolves.toMatchObject({
      outbox: [
        {method: 'MessageQueued', params: {recipient: 'bob', sender: 'alice', data}},
        {method: 'MessageQueued', params: {recipient: 'hub', sender: 'alice'}}, // TODO: Expect some specific data
      ],
      // TODO: channelResults is not calculated correctly: see the Channel model's channelResult
      // implementation
      // channelResults: [{channelId, turnNum: 3, outcome, status: 'funding'}],
    });

    const updated = await Channel.forId(channelId, undefined);
    expect(updated.protocolState).toMatchObject({latest: preFS, supported: preFS});
  });
});
