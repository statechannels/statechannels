import {channelProvider} from '../src/channel-provider';

describe('ChannelProvider', () => {
  it('can be enabled', done => {
    const onMessageSpy = jest.spyOn(window, 'addEventListener');

    channelProvider.on('connect', () => {
      expect(onMessageSpy).toHaveBeenCalled();
      done();
    });

    channelProvider.enable();
  });
});
