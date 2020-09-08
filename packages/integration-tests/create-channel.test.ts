/* eslint-disable no-undef */

import {IFrameChannelProviderInterface} from '@statechannels/iframe-channel-provider';
import {ChannelClient} from '@statechannels/channel-client';
import {getChannelId} from '@statechannels/nitro-protocol';

import {sleep} from './helpers';
import {injectOriginToBlankPostMessages} from './test-utils';

jest.setTimeout(10000);
const WALLET_URL = 'http://localhost:3055';

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
    token: '0x00',
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
let signingAddress: string;

beforeAll(async () => {
  // workaround for https://gitub.com/jsdom/jsdom/issues/2745
  // if no origin exists, replace with the wallet url
  injectOriginToBlankPostMessages(window, WALLET_URL);

  require('@statechannels/iframe-channel-provider');
  channelProvider = (window as any).channelProvider;
  channelClient = new ChannelClient(channelProvider);
  await channelProvider.mountWalletComponent(WALLET_URL);
  iframe = document.getElementById('channelProviderUi') as HTMLIFrameElement;
  const enablePromise = channelProvider.enable();
  await sleep(100); // wait for UI
  iframe.contentWindow?.document.getElementById('connect-with-metamask-button')?.click();
  await enablePromise;
});

describe('Client-Provider-Wallet', () => {
  it('Calls createChannel() with direct funding, and queues an appropriate message', async done => {
    signingAddress = channelProvider.signingAddress as string;
    participants[0].signingAddress = signingAddress;

    const expectedMessage = {
      recipient: '0x590A3Bd8D4A3b78411B3bDFb481E44e85C7345c0',
      sender: signingAddress,
      data: {
        objectives: undefined,
        signedStates: [
          {
            appData,
            appDefinition,
            chainId: '9001',
            challengeDuration: 300,
            channelId: getChannelId({
              channelNonce: 0,
              participants: participants.map(p => p.signingAddress),
              chainId: '9001'
            }),
            channelNonce: 0,
            isFinal: false,
            outcome: [
              {
                allocationItems: [
                  {
                    amount: '0x00000000000000000000000000000000000000000000000006f05b59d3b20000',
                    destination:
                      '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7'
                  },
                  {
                    amount: '0x00000000000000000000000000000000000000000000000006f05b59d3b20000',
                    destination:
                      '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7'
                  }
                ],
                assetHolderAddress: '0x4ad3F07BEFDC54511449A1f553E36A653c82eA57'
              }
            ],
            participants: [
              {
                destination: '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7',
                participantId: '0xAE363d29fc0f6A9bbBbEcC87751e518Cd9CA83C0',
                signingAddress
              },
              {
                destination: '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7',
                participantId: '0x590A3Bd8D4A3b78411B3bDFb481E44e85C7345c0',
                signingAddress: '0x590A3Bd8D4A3b78411B3bDFb481E44e85C7345c0'
              }
            ],
            signatures: [expect.stringContaining('0x')],
            turnNum: 0
          }
        ]
      }
    };

    channelClient.onMessageQueued(message => {
      expect(message).toMatchObject(expectedMessage);
      done();
    });
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
    const channelResult = await createChannelPromise;
    expect(channelResult).toBeDefined();
  });
});
