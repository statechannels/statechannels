import { Channel, ChannelError } from '../channel';
import { seedAlicesSigningWallet } from '../../db/seeds/1_signing_wallet_seeds';
import { stateWithHashSignedBy } from '../../wallet/__test__/fixtures/states';
import { testKnex as knex } from '../../../jest/knex-setup-teardown';
import { dropNonVariables } from '../../state-utils';

import { channel } from './fixtures/channel';

beforeEach(async () => seedAlicesSigningWallet(knex));
afterAll(async () => await knex.destroy());

it('can insert Channel instances to, and fetch them from, the database', async () => {
  const vars = [stateWithHashSignedBy()({ channelNonce: 1234 })];
  const c1 = channel({ channelNonce: 1234, vars });

  await Channel.query(knex).withGraphFetched('signingWallet').insert(c1);

  expect(c1.signingWallet).toBeDefined();

  const c2 = await Channel.query(knex).where({ channel_nonce: 1234 }).first();

  expect(c1.vars).toMatchObject(c2.vars);
});

it('does not store extraneous fields in the variables property', async () => {
  const vars = [{ ...stateWithHashSignedBy()(), extra: true }];
  const c1 = channel({ vars });
  await Channel.transaction(knex, async tx => {
    await Channel.query(tx).insert(c1);

    const rawVars = (await tx.raw('select vars from channels')).rows[0].vars;
    const expectedVars = [dropNonVariables(stateWithHashSignedBy()())];
    expect(rawVars).toMatchObject(expectedVars);
  });
});

it('can insert multiple channels instances within a transaction', async () => {
  const c1 = channel({ vars: [stateWithHashSignedBy()()] });
  const c2 = channel({
    channelNonce: 1234,
    vars: [stateWithHashSignedBy()({ channelNonce: 1234 })],
  });

  await Channel.transaction(knex, async tx => {
    await Channel.query(tx).insert(c1);

    expect(await Channel.query(tx).select()).toHaveLength(1);

    await Channel.query(tx).insert(c2);
    expect(await Channel.query(tx).select()).toHaveLength(2);

    // You can query the DB outside of this transaction,
    // where the channels have not yet been committed
    expect(await Channel.query(knex).select()).toHaveLength(0);
  });

  // The transaction has been committed. Two channels were stored.
  expect(await Channel.query(knex).select()).toHaveLength(2);
});

describe('validation', () => {
  it('throws when inserting a model where the channelId is inconsistent', () =>
    expect(
      Channel.query(knex).insert({
        ...channel({ vars: [stateWithHashSignedBy()()] }),
        channelId: 'wrongId',
      })
    ).rejects.toThrow(ChannelError.reasons.invalidChannelId));
});
