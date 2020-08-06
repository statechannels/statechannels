/**
 * @jest-environment jsdom
 */

jest.setTimeout(30000);

import {IFrameChannelProviderInterface} from '@statechannels/iframe-channel-provider';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ifp = require('@statechannels/iframe-channel-provider');

let cp = (window as any).channelProvider as IFrameChannelProviderInterface;

describe('Client-Provider-Wallet', () => {
  beforeAll(() => {
    cp = ifp;
  });

  it('Attaches the channel provider to the window object', () => {
    expect((window as any).channelProvider).toBeDefined();
  });

  it('Mounts the iframe pointed at the hosted wallet, and enables', async () => {
    await ((window as any).channelProvider as IFrameChannelProviderInterface).mountWalletComponent(
      'https://xstate-wallet.statechannels.org/'
    );
    await ((window as any).channelProvider as IFrameChannelProviderInterface).enable();
    expect(
      ((window as any).channelProvider as IFrameChannelProviderInterface).walletVersion
    ).toBeDefined();
  });
});
