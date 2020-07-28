import matchers from '@pacote/jest-either';

import {updateChannel, UpdateChannelError} from '../update-channel';
import {updateChannelFixture, signStateFixture} from '../fixtures/update-channel';
import {channelStateFixture} from '../../protocols/__test__/fixtures/channel-state';

expect.extend(matchers);

test('validUpdate', () => {
  const result = updateChannel(updateChannelFixture(), channelStateFixture());
  expect(result).toEqualRight(signStateFixture());
});

test('Not my turn', () => {
  const result = updateChannel(
    updateChannelFixture(),
    channelStateFixture({supported: {turnNum: 4}})
  );
  expect(result).toEqualLeft(new UpdateChannelError(UpdateChannelError.Errors.notMyTurn));
});

enum ColorsEnum {
  white = '#ffffff',
  black = '#000000',
}

type Colors = keyof typeof ColorsEnum;
