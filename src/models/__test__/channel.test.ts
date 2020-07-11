import { Channel } from '../channel';
import { channel } from '../../wallet/__test__/fixtures/channel';
import { stateWithHashSignedBy } from '../../wallet/__test__/fixtures/states';

it('can insert Channel instances to, and fetch them from, the database', async () => {
  const vars = [stateWithHashSignedBy()()];
  const c1 = channel({ channelNonce: 1234, vars });

  await Channel.query().insert(c1);

  const c2 = await Channel.query()
    .where({ channel_nonce: 1234 })
    .first();

  expect(c1.vars).toMatchObject(c2.vars);
});

it('can insert multiple channel instances within a transaction', async () => {
  const vars = [stateWithHashSignedBy()()];
  const c1 = channel({ vars });
  const c2 = channel({ channelNonce: 1234, vars });

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
