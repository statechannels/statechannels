import {ChannelClient} from '../src/channel-client';
import {ChannelProviderInterface} from '@statechannels/channel-provider';

// TODO: Figure out how to test
describe('ChannelClient', () => {
  it('instantiates', () => {
    expect(
      new ChannelClient({
        enable: () => {
          /* do nothing */
        },
        on: (_method, _callback) => {
          /* do nothing */
        }
      } as ChannelProviderInterface)
    ).toBeDefined();
  });
});
