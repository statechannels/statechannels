/* eslint-disable no-undef */
/**
 * @jest-environment jsdom
 */

import {IFrameChannelProviderInterface} from '@statechannels/iframe-channel-provider';
jest.setTimeout(3000);
require('@statechannels/iframe-channel-provider');

let channelProvider: IFrameChannelProviderInterface;

beforeAll(() => {
  window.addEventListener('message', event => console.log(event));
  channelProvider = (window as any).channelProvider;
});

describe('Client-Provider-Wallet', () => {
  it('Mounts the iframe pointed at the hosted wallet, and enables', async () => {
    console.log(channelProvider);
    const mountPromise = channelProvider.mountWalletComponent(
      'https://xstate-wallet.statechannels.org/'
    );

    window.dispatchEvent(new MessageEvent('message', {data: 'Wallet Ready'}));
    await mountPromise;
    await channelProvider.enable();
    expect(channelProvider.walletVersion).toBeDefined();
  });
});
