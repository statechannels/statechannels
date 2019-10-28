import {channelProvider} from '../src/channel-provider';

describe('ChannelProvider', () => {
  it('can register events', done => {
    channelProvider.on('connect', ({success}) => {
      expect(success).toEqual(true);
      done();
    });

    channelProvider.enable();
  });
});
