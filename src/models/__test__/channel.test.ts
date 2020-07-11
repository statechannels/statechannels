import { Channel } from '../channel';
import { channel } from '../../wallet/__test__/fixtures/channel';
import { stateWithSignaturesAndHash } from '../../wallet/__test__/fixtures/states';

it('can insert Channel instances to, and fetch them from, the database', async () => {
  const vars = [stateWithSignaturesAndHash()];
  const c1 = channel({ channelNonce: 1234, vars });

  await Channel.query().insert(c1);

  const c2 = await Channel.query()
    .where({ channel_nonce: 1234 })
    .first();

  expect(c1.vars).toMatchObject(c2.vars);
});
