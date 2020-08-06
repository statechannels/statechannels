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
    await channelProvider.mountWalletComponent('http://localhost:3055');
    await channelProvider.enable();
    expect(channelProvider.walletVersion).toBeDefined();
  });
});
