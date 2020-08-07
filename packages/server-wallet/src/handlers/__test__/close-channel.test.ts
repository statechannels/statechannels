import matchers from '@pacote/jest-either';

import {closeChannel, CloseChannelError} from '../close-channel';
import {signStateFixture} from '../../protocols/__test__/fixtures/actions';
import {channelStateFixture} from '../../protocols/__test__/fixtures/channel-state';
import {ChannelState} from '../../protocols/state';

expect.extend(matchers);

test('validClose', () => {
  const cs = channelStateFixture();
  const {channelId} = cs;
  expect(closeChannel({channelId}, cs)).toMatchRight(
    signStateFixture({isFinal: true, turnNum: cs.supported.turnNum + 1})
  );
});

const notMyTurnErr = new CloseChannelError(CloseChannelError.reasons.notMyTurn);
const noSupportedStateErr = new CloseChannelError(CloseChannelError.reasons.noSupportedState);

const noSupportedState: ChannelState = {...channelStateFixture(), supported: undefined};
test.each`
  channelState                                      | result
  ${noSupportedState}                               | ${noSupportedStateErr}
  ${channelStateFixture({supported: {turnNum: 4}})} | ${notMyTurnErr}
`('error cases $result', ({channelState, result}) => {
  expect(closeChannel({channelId: channelState.channelId}, channelState)).toEqualLeft(result);
});
