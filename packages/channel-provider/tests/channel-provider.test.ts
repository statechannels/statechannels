import {channelProvider} from '../src/channel-provider';

describe('ChannelProvider', () => {
  it('can be enabled', () => {
    const onMessageSpy = jest.spyOn(window, 'addEventListener');

    channelProvider.enable('www.test.com');

    expect(onMessageSpy).toHaveBeenCalled();
  });
});
