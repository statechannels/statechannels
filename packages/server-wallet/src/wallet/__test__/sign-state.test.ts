import Objection from 'objection';
import matchers from '@pacote/jest-either';
import {right} from 'fp-ts/lib/Either';

import {Store} from '../store';
import {channel} from '../../models/__test__/fixtures/channel';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import knex from '../../db/connection';
import {Channel} from '../../models/channel';

import {stateWithHashSignedBy} from './fixtures/states';
import {bob} from './fixtures/signing-wallets';

expect.extend(matchers);

let tx: Objection.Transaction;
beforeEach(async () => {
  await seedAlicesSigningWallet(knex);

  // Start the transaction
  tx = await Channel.startTransaction();
});

afterEach(async () => tx.rollback());

describe('signState', () => {
  let c: Channel;

  beforeEach(async () => {
    c = await Channel.query().insert(channel({vars: [stateWithHashSignedBy(bob())()]}));
  });

  it('signs the state, returning outgoing messages and a channelResult', async () => {
    await expect(Channel.query().where({id: c.id})).resolves.toHaveLength(1);
    expect(c.latestSignedByMe).toBeUndefined();

    const result = await Store.signState(c.channelId, c.vars[0], tx);
    expect(result).toMatchObject(
      right({
        outgoing: [
          {
            type: 'NotifyApp',
            notice: {
              method: 'MessageQueued',
              params: {data: {signedStates: [{...c.vars[0], signatures: expect.any(Object)}]}},
            },
          },
        ],
        channelResult: {turnNum: c.vars[0].turnNum},
      })
    );
  });

  it('uses a transaction', async () => {
    const updatedC = await Store.signState(c.channelId, c.vars[0], tx);
    expect(updatedC).toBeRight();

    // Fetch the current channel outside the transaction context
    const currentC = await Channel.forId(c.channelId, undefined);
    expect(currentC.latestSignedByMe).toBeUndefined();

    const pendingC = await Channel.forId(c.channelId, tx);
    expect(pendingC.latestSignedByMe).toBeDefined();
  });
});
