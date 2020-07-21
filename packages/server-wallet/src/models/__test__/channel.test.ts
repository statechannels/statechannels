import {Channel, Errors} from '../channel';
import {seed} from '../../db/seeds/1_signing_wallet_seeds';
import {stateWithHashSignedBy} from '../../wallet/__test__/fixtures/states';
import knex from '../../db/connection';

import {channel} from './fixtures/channel';

beforeEach(async () => seed(knex));

it('can insert Channel instances to, and fetch them from, the database', async () => {
  const vars = [stateWithHashSignedBy()()];
  const c1 = channel({channelNonce: 1234, vars});

  await Channel.query()
    .withGraphFetched('signingWallet')
    .insert(c1);

  expect(c1.signingWallet).toBeDefined();

  const c2 = await Channel.query()
    .where({channel_nonce: 1234})
    .first();

  expect(c1.vars).toMatchObject(c2.vars);
});

it('can insert multiple channel instances within a transaction', async () => {
  const vars = [stateWithHashSignedBy()()];
  const c1 = channel({vars});
  const c2 = channel({channelNonce: 1234, vars});

  await Channel.transaction(async tx => {
    await Channel.query(tx).insert(c1);

    expect(await Channel.query(tx).select()).toHaveLength(1);

    await Channel.query(tx).insert(c2);
    expect(await Channel.query(tx).select()).toHaveLength(2);

    // You can query the DB outside of this transaction,
    // where the channels have not yet been committed
    expect(await Channel.query().select()).toHaveLength(0);
  });

  // The transaction has been committed. Two channels were stored.
  expect(await Channel.query().select()).toHaveLength(2);
});

describe('validation', () => {
  it('throws when inserting a model where the channelId is inconsistent', () =>
    expect(
      Channel.query().insert({
        ...channel({vars: [stateWithHashSignedBy()()]}),
        channelId: 'wrongId',
      })
    ).rejects.toThrow(Errors.invalidChannelId));
});
