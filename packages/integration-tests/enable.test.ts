/* eslint-disable no-undef */

import {IFrameChannelProviderInterface} from '@statechannels/iframe-channel-provider';

import {sleep} from './helpers';
import {injectOriginToBlankPostMessages} from './test-utils';

jest.setTimeout(10000);
let channelProvider: IFrameChannelProviderInterface;

const WALLET_URL = 'http://localhost:3055';

beforeAll(async () => {
  require('@statechannels/iframe-channel-provider');
  channelProvider = (window as any).channelProvider;

  // workaround for https://github.com/jsdom/jsdom/issues/2745
  // if no origin exists, replace with the wallet url
  injectOriginToBlankPostMessages(window, WALLET_URL);

  await channelProvider.mountWalletComponent(WALLET_URL);
});

describe('Client-Provider-Wallet', () => {
  it('Mounts the iframe pointed at the hosted wallet, and enables', async () => {
    const iframe = document.getElementById('channelProviderUi') as HTMLIFrameElement;
    const enablePromise = channelProvider.enable();
    await sleep(100); // wait for UI
    iframe.contentWindow?.document.getElementById('connect-with-metamask-button')?.click();
    await enablePromise;
    expect(channelProvider.signingAddress).toBeDefined();
  });

  it('Copes with an empty message from the wallet url', () => {
    const event: MessageEvent = new MessageEvent('message', {
      data: '',
      origin: WALLET_URL
    });

    expect(() => window.dispatchEvent(event)).not.toThrow();
  });

  it('Copes with an empty message from a different url', () => {
    const event: MessageEvent = new MessageEvent('message', {
      data: '',
      origin: 'http://some.origin'
    });

    expect(() => window.dispatchEvent(event)).not.toThrow();
  });
});
