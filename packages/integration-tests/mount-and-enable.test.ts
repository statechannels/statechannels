/* eslint-disable no-undef */

import {IFrameChannelProviderInterface} from '@statechannels/iframe-channel-provider';

import {sleep} from './helpers';
jest.setTimeout(10000);
require('@statechannels/iframe-channel-provider');

let channelProvider: IFrameChannelProviderInterface;

beforeAll(() => {
  channelProvider = (window as any).channelProvider;
});

describe('Client-Provider-Wallet', () => {
  it('Mounts the iframe pointed at the hosted wallet, and enables', async () => {
    await channelProvider.mountWalletComponent('http://localhost:3055');
    expect(() => window.postMessage('', '*')).not.toThrow();
    const iframe = document.getElementById('channelProviderUi') as HTMLIFrameElement;
    const enablePromise = channelProvider.enable();
    await sleep(100); // wait for UI
    iframe.contentWindow?.document.getElementById('connect-with-metamask-button')?.click();
    await enablePromise;
    expect(channelProvider.signingAddress).toBeDefined();
  });
});
