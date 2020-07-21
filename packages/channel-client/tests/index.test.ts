import {ChannelProviderInterface} from '@statechannels/channel-provider';

import {ChannelClient} from '../src/channel-client';

// TODO: Figure out how to test
describe('ChannelClient', () => {
  it('instantiates', () => {
    expect(
      new ChannelClient({
        enable: () => {
          /* do nothing */
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        on: (_method, _callback) => {
          /* do nothing */
        }
      } as ChannelProviderInterface)
    ).toBeDefined();
  });
});
