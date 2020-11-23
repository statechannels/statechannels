import { UpdateChannelError } from '../../handlers/update-channel';
import { isWalletError } from '../wallet-error';

test('passes typeguard', () => {
  const updateChannelError = new UpdateChannelError(UpdateChannelError.reasons.channelNotFound);
  expect(isWalletError(updateChannelError)).toBeTruthy();
});

test('fails typeguard', () => {
  const fakeError = { type: 'bogusError' };
  expect(isWalletError(fakeError)).toBeFalsy();
});
