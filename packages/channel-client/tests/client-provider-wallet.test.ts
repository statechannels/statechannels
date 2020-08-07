/* eslint-disable no-undef */

import {IFrameChannelProviderInterface} from '@statechannels/iframe-channel-provider';

jest.setTimeout(30000);
require('@statechannels/iframe-channel-provider');

let channelProvider: IFrameChannelProviderInterface;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

beforeAll(() => {
  channelProvider = (window as any).channelProvider;
});

describe('Client-Provider-Wallet', () => {
  it('Mounts the iframe pointed at the hosted wallet, and enables', async () => {
    await channelProvider.mountWalletComponent('http://localhost:3055');
    const iframe = document.getElementById('channelProviderUi') as HTMLIFrameElement;
    const enablePromise = channelProvider.enable();
    await sleep(1000); // wait for UI
    iframe.contentWindow?.document.getElementById('connect-with-metamask-button')?.click();
    await enablePromise;
    expect(channelProvider.signingAddress).toBeDefined();
  });
});
