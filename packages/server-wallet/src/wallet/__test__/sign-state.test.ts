import Objection from 'objection';
import {signState} from '@statechannels/wallet-core';

import {Store} from '../store';
import {channel} from '../../models/__test__/fixtures/channel';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {Channel} from '../../models/channel';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';

import {stateWithHashSignedBy} from './fixtures/states';
import {bob, alice} from './fixtures/signing-wallets';

let tx: Objection.Transaction;
beforeEach(async () => {
  await seedAlicesSigningWallet(knex);

  // Start the transaction
  tx = await Channel.startTransaction(knex);
});

afterEach(async () => tx.rollback());

describe('signState', () => {
  let c: Channel;

  beforeEach(async () => {
    c = await Channel.query(knex).insert(channel({vars: [stateWithHashSignedBy(bob())()]}));
  });

  it('signs the state, returning outgoing messages and a channelResult', async () => {
    await expect(Channel.query(knex).where({id: c.id})).resolves.toHaveLength(1);
    expect(c.latestSignedByMe).toBeUndefined();
    const signature = signState({...c.vars[0], ...c.channelConstants}, alice().privateKey);
    const result = await Store.signState(c.channelId, c.vars[0], tx);
    expect(result).toMatchObject({
      outgoing: [
        {
          type: 'NotifyApp',
          notice: {
            method: 'MessageQueued',
            params: {
              data: {
                signedStates: [{...c.vars[0], signatures: [{signature, signer: alice().address}]}],
              },
            },
          },
        },
      ],
      channelResult: {turnNum: c.vars[0].turnNum},
    });
  });

  it('uses a transaction', async () => {
    const updatedC = await Store.signState(c.channelId, c.vars[0], tx);
    expect(updatedC).toBeDefined();

    // Fetch the current channel outside the transaction context
    const currentC = await Channel.forId(c.channelId, knex);
    expect(currentC.latestSignedByMe).toBeUndefined();

    const pendingC = await Channel.forId(c.channelId, tx);
    expect(pendingC.latestSignedByMe).toBeDefined();
  });
});
