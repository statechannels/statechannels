import Objection from 'objection';

import {Store} from '../store';
import {channel} from '../../models/__test__/fixtures/channel';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import knex from '../../db/connection';
import {Channel} from '../../models/channel';

import {stateWithHashSignedBy} from './fixtures/states';
import {bob} from './fixtures/signing-wallets';

let tx: Objection.Transaction;
beforeEach(async () => {
  await seedAlicesSigningWallet(knex);

  // Start the transaction
  tx = await Store.startTransaction();
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

    const result = await Store.signState(c.channelId, c.vars[0]);
    expect(result).toMatchObject({
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
    });
  });
});
