import matchers from '@pacote/jest-either';

import {updateChannel} from '../update-channel';
import {
  updateChannelFixture,
  channelStateFixture,
  signStateFixture,
} from '../fixtures/update-channel';

expect.extend(matchers);

test('validUpdate', () => {
  const result = updateChannel(updateChannelFixture(), channelStateFixture());
  expect(result).toEqualRight(signStateFixture());
});
