/* eslint-disable no-undef */

import {IFrameChannelProviderInterface} from '@statechannels/iframe-channel-provider';

jest.setTimeout(30000);
require('@statechannels/iframe-channel-provider');

let channelProvider: IFrameChannelProviderInterface;

beforeAll(() => {
  window.addEventListener('message', event => console.log(event.data));
  channelProvider = (window as any).channelProvider;
  console.log(window.location.href);
});

describe('Client-Provider-Wallet', () => {
  it('Mounts the iframe pointed at the hosted wallet, and enables', async () => {
    const mountPromise = channelProvider.mountWalletComponent(
      'https://xstate-wallet.statechannels.org/'
    );

    // const walletReadyMessage: WalletReady = {
    //   jsonrpc: '2.0',
    //   method: 'WalletReady',
    //   params: {}
    // };

    // window.dispatchEvent(
    //   new MessageEvent('message', {
    //     origin: 'https://xstate-wallet.statechannels.org/',
    //     data: walletReadyMessage
    //   })
    // );
    console.log(channelProvider);
    await mountPromise;
    await channelProvider.enable();
    expect(channelProvider.walletVersion).toBeDefined();
  });
});
