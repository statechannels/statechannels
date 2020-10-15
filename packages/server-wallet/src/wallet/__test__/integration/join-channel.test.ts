import {simpleEthAllocation, serializeOutcome, BN} from '@statechannels/wallet-core';

import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {truncate} from '../../../db-admin/db-admin-connection';
import {stateWithHashSignedBy} from '../fixtures/states';
import {bob} from '../fixtures/signing-wallets';
import {channel} from '../../../models/__test__/fixtures/channel';
import {alice} from '../fixtures/participants';
import {defaultTestConfig} from '../../../config';

let w: Wallet;
beforeEach(async () => {
  w = new Wallet(defaultTestConfig);
  await truncate(w.knex);
});

afterEach(async () => {
  await w.destroy();
});

beforeEach(async () => seedAlicesSigningWallet(w.knex));

describe('directly funded app', () => {
  it('signs multiple prefund setups when joining multiple channels', async () => {
    const appData = '0x0f00';
    const preFS = {turnNum: 0, appData};
    const state1 = {...preFS, channelNonce: 1};
    const state2 = {...preFS, channelNonce: 2};

    const c1 = channel({channelNonce: 1, vars: [stateWithHashSignedBy(bob())(state1)]});

    await Channel.query(w.knex).insert(c1);
    const c2 = channel({channelNonce: 2, vars: [stateWithHashSignedBy(bob())(state2)]});

    await Channel.query(w.knex).insert(c2);
    const channelIds = [c1, c2].map(c => c.channelId);
    const result = await w.joinChannels(channelIds);
    expect(result).toMatchObject({
      outbox: [
        {params: {recipient: 'bob', sender: 'alice', data: {signedStates: [state1, state2]}}},
      ],
      channelResults: [{channelId: c1.channelId}, {channelId: c2.channelId}],
    });

    await Promise.all(
      channelIds.map(async c => {
        const updated = await Channel.forId(c, w.knex);
        expect(updated.protocolState).toMatchObject({latest: preFS, supported: preFS});
      })
    );
  });

  it('signs the prefund setup ', async () => {
    const appData = '0x0f00';
    const preFS = {turnNum: 0, appData};

    const c = channel({vars: [stateWithHashSignedBy(bob())(preFS)]});
    await Channel.query(w.knex).insert(c);

    const channelId = c.channelId;
    const current = await Channel.forId(channelId, w.knex);
    expect(current.protocolState).toMatchObject({latest: preFS, supported: undefined});

    await expect(w.joinChannel({channelId})).resolves.toMatchObject({
      outbox: [{params: {recipient: 'bob', sender: 'alice', data: {signedStates: [preFS]}}}],
      // channelResults: [{channelId, turnNum: 0, appData, status: 'funding'}],
    });

    const updated = await Channel.forId(channelId, w.knex);
    expect(updated.protocolState).toMatchObject({latest: preFS, supported: preFS});
  });

  it('signs the prefund setup and postfund setup, when there are no deposits to make', async () => {
    const outcome = simpleEthAllocation([]);
    const preFS = {turnNum: 0, outcome};
    const postFS = {turnNum: 2, outcome};
    const c = channel({vars: [stateWithHashSignedBy(bob())(preFS)]});
    await Channel.query(w.knex).insert(c);

    const outcomeWire = serializeOutcome(outcome);
    const preFSWire = {turnNum: 0, outcome: outcomeWire};
    const postFSWire = {turnNum: 2, outcome: outcomeWire};

    const channelId = c.channelId;
    const current = await Channel.forId(channelId, w.knex);
    expect(current.latest).toMatchObject(preFS);

    await expect(w.joinChannel({channelId})).resolves.toMatchObject({
      outbox: [
        {
          params: {
            recipient: 'bob',
            sender: 'alice',
            data: {signedStates: [preFSWire, postFSWire]},
          },
        },
      ],
      // TODO: channelResults is not calculated correctly: see the Channel model's channelResult
      // implementation
      // channelResults: [{channelId, turnNum: 3, outcome, status: 'funding'}],
    });

    const updated = await Channel.forId(channelId, w.knex);
    expect(updated.protocolState).toMatchObject({latest: postFS, supported: preFS});
  });

  it('signs the prefund setup and makes a deposit, when I am first to deposit in a directly funded app', async () => {
    const outcome = simpleEthAllocation([{destination: alice().destination, amount: BN.from(5)}]);
    const preFS = {turnNum: 0, outcome};
    const c = channel({vars: [stateWithHashSignedBy(bob())(preFS)]});
    await Channel.query(w.knex).insert(c);

    const channelId = c.channelId;
    const current = await Channel.forId(channelId, w.knex);
    expect(current.latest).toMatchObject(preFS);

    await expect(w.joinChannel({channelId})).resolves.toMatchObject({
      outbox: [
        {
          method: 'MessageQueued',
          params: {
            recipient: 'bob',
            sender: 'alice',
            data: {signedStates: [{...preFS, outcome: serializeOutcome(preFS.outcome)}]},
          },
        },
      ],
      channelResult: {channelId, turnNum: 0, status: 'opening'},
    });

    const updated = await Channel.forId(channelId, w.knex);
    expect(updated.protocolState).toMatchObject({
      latest: preFS,
      supported: preFS,
      chainServiceRequests: ['fund'],
    });
  });
});
