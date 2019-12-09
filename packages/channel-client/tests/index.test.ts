import ChannelClient from '../src';
import {IChannelProvider} from '@statechannels/channel-provider';

// TODO: Figure out how to test
describe('ChannelClient', () => {
  it('instantiates', () => {
    expect(
      new ChannelClient({
        enable: () => {
          /* do nothing */
        }
      } as IChannelProvider)
    ).toBeDefined();
  });
});
