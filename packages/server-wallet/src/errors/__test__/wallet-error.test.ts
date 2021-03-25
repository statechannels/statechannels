import {UpdateChannelError} from '../../handlers/update-channel';
import {isEngineError} from '../wallet-error';

test('passes typeguard', () => {
  const updateChannelError = new UpdateChannelError(UpdateChannelError.reasons.channelNotFound);
  expect(isEngineError(updateChannelError)).toBeTruthy();
});

test('fails typeguard', () => {
  const fakeError = {type: 'bogusError'};
  expect(isEngineError(fakeError)).toBeFalsy();
});
