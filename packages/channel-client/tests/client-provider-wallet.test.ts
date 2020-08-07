/* eslint-disable no-undef */

import {IFrameChannelProviderInterface} from '@statechannels/iframe-channel-provider';

jest.setTimeout(30000);
require('@statechannels/iframe-channel-provider');

let channelProvider: IFrameChannelProviderInterface;

beforeAll(() => {
  channelProvider = (window as any).channelProvider;
});

describe('Client-Provider-Wallet', () => {
  it('Mounts the iframe pointed at the hosted wallet, and enables', async () => {
    await channelProvider.mountWalletComponent('http://localhost:3055');
    return await channelProvider.enable();
  });
});
