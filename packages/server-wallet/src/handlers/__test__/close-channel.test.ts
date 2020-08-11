import matchers from '@pacote/jest-either';

import {closeChannel, CloseChannelError} from '../close-channel';
import {signStateFixture} from '../../protocols/__test__/fixtures/actions';
import {channelStateFixture} from '../../protocols/__test__/fixtures/channel-state';
import {ChannelState} from '../../protocols/state';

expect.extend(matchers);

test('validClose', () => {
  const cs = channelStateFixture();
  expect(closeChannel(cs)).toMatchRight(
    signStateFixture({isFinal: true, turnNum: cs.supported.turnNum + 1})
  );
});

const notMyTurnErr = new CloseChannelError(CloseChannelError.reasons.notMyTurn);
const noSupportedStateErr = new CloseChannelError(CloseChannelError.reasons.noSupportedState);

const noSupportedState: ChannelState = channelStateFixture({}, {supported: undefined});
const evenTurnedSupportedState = channelStateFixture({supported: {turnNum: 4}});

test.each`
  channelState                | error
  ${noSupportedState}         | ${noSupportedStateErr}
  ${evenTurnedSupportedState} | ${notMyTurnErr}
`('error cases $error', ({channelState, error}) => {
  expect(closeChannel(channelState)).toEqualLeft(error);
});
