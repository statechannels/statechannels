import Objection from 'objection';

import {handleSignState} from '../actionHandlers';
import {signState} from '../../protocols/actions';
import {channel} from '../../models/__test__/fixtures/channel';
import {seed} from '../../db/seeds/1_signing_wallet_seeds';
import knex from '../../db/connection';
import {Channel} from '../../models/channel';

import {stateWithHashSignedBy} from './fixtures/states';
import {bob} from './fixtures/signingWallets';

let tx: Objection.Transaction;
beforeEach(async () => {
  // Make sure alice's PK is in the DB
  await seed(knex);

  // Start the transaction
  tx = await Channel.startTransaction();
});

afterEach(async () => tx.rollback());

describe('SignState action handler', () => {
  let c: Channel;

  beforeEach(async () => {
    c = await Channel.query().insert(channel({vars: [stateWithHashSignedBy(bob())()]}));
  });

  it('signs the state', async () => {
    await expect(Channel.query().where({id: c.id})).resolves.toHaveLength(1);
    expect(c.latestSignedByMe).toBeUndefined();

    const updatedC = await handleSignState(signState(c.channelId, c.vars[0]), tx);
    expect(updatedC.latestSignedByMe).toBeDefined();
  });

  it('uses a transaction', async () => {
    const updatedC = await handleSignState(signState(c.channelId, c.vars[0]), tx);
    expect(updatedC.latestSignedByMe).toBeDefined();

    // Fetch the current channel outside the transaction context
    const currentC = await Channel.forId(updatedC.channelId, undefined);
    expect(currentC.latestSignedByMe).toBeUndefined();
  });
});
