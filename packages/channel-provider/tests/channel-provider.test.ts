import {channelProvider} from '../src/channel-provider';

describe('ChannelProvider', () => {
  it('can be be connected to a wallet', () => {
    const onMessageSpy = jest.spyOn(window, 'addEventListener');

    channelProvider.mountWalletComponent('www.test.com');

    expect(onMessageSpy).toHaveBeenCalled();
  });
});
