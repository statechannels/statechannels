/* eslint-disable no-undef */

import {IFrameChannelProviderInterface} from '@statechannels/iframe-channel-provider';
import {ChannelClient} from '@statechannels/channel-client';

import {sleep} from './helpers';
jest.setTimeout(10000);
require('@statechannels/iframe-channel-provider');

const participants = [
  {
    participantId: '0xAE363d29fc0f6A9bbBbEcC87751e518Cd9CA83C0',
    signingAddress: '0xAE363d29fc0f6A9bbBbEcC87751e518Cd9CA83C0',
    destination: '0x63e3fb11830c01ac7c9c64091c14bb6cbaac9ac7'
  },
  {
    participantId: '0x590A3Bd8D4A3b78411B3bDFb481E44e85C7345c0',
    signingAddress: '0x590A3Bd8D4A3b78411B3bDFb481E44e85C7345c0',
    destination: '0x63e3fb11830c01ac7c9c64091c14bb6cbaac9ac7'
  }
];
const allocations = [
  {
    token: '0x0',
    allocationItems: [
      {
        destination: '0x63e3fb11830c01ac7c9c64091c14bb6cbaac9ac7',
        amount: '0x00000000000000000000000000000000000000000000000006f05b59d3b20000'
      },
      {
        destination: '0x63e3fb11830c01ac7c9c64091c14bb6cbaac9ac7',
        amount: '0x00000000000000000000000000000000000000000000000006f05b59d3b20000'
      }
    ]
  }
];

const appDefinition = '0x430869383d611bBB1ce7Ca207024E7901bC26b40';
const appData =
  '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004444444444444444444444444444444444444444444444444444444444444444';
const fundingStrategy = 'Direct';

let channelProvider: IFrameChannelProviderInterface;
let channelClient: ChannelClient;
let iframe: HTMLIFrameElement;

beforeAll(async () => {
  channelProvider = (window as any).channelProvider;
  channelClient = new ChannelClient(channelProvider);
  await channelProvider.mountWalletComponent('http://localhost:3055');
  iframe = document.getElementById('channelProviderUi') as HTMLIFrameElement;
  const enablePromise = channelProvider.enable();
  await sleep(100); // wait for UI
  iframe.contentWindow?.document.getElementById('connect-with-metamask-button')?.click();
  await enablePromise;
});

describe('Client-Provider-Wallet', () => {
  it('Calls createChannel()', async () => {
    const createChannelPromise = channelClient.createChannel(
      participants,
      allocations,
      appDefinition,
      appData,
      fundingStrategy
    );
    await sleep(200); // wait for UI
    console.log(iframe.contentWindow?.document.body.innerHTML);
    iframe.contentWindow?.document.getElementById('yes')?.click();
    await createChannelPromise;
  });
});
