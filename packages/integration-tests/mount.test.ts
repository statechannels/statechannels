/* eslint-disable no-undef */

import {IFrameChannelProviderInterface} from '@statechannels/iframe-channel-provider';

import {injectOriginToBlankPostMessages} from './test-utils';

jest.setTimeout(10000);
let channelProvider: IFrameChannelProviderInterface;

const WALLET_URL = 'http://localhost:3055';
const WALLET_URL_WITH_TRAILING_SLASH = 'http://localhost:3055/';

beforeAll(async () => {
  require('@statechannels/iframe-channel-provider');
  channelProvider = (window as any).channelProvider;

  // workaround for https://github.com/jsdom/jsdom/issues/2745
  // if no origin exists, replace with the wallet url
  injectOriginToBlankPostMessages(window, WALLET_URL); // Trailing slash is not part of origin
});

describe('Client-Provider-Wallet', () => {
  it('Mounts the iframe when URL has no trailing slash ', async () => {
    await channelProvider.mountWalletComponent(WALLET_URL);
  });
  it('Mounts the iframe when URL has a trailing slash ', async () => {
    await channelProvider.mountWalletComponent(WALLET_URL_WITH_TRAILING_SLASH);
  });
});
