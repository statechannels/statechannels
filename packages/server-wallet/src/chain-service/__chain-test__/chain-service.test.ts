import {randomChannelId} from '@statechannels/nitro-protocol';
import {BN} from '@statechannels/wallet-core';
import {providers} from 'ethers';

import {defaultConfig} from '../../config';
import {ChainService} from '../chain-service';

/* eslint-disable-next-line no-process-env, @typescript-eslint/no-non-null-assertion */
const ethAssetHolderAddress = process.env.ETH_ASSET_HOLDER_ADDRESS!;

let rpcEndpoint: string;
let chainService: ChainService;
beforeAll(() => {
  if (!defaultConfig.rpcEndpoint) throw new Error('rpc endpoint must be defined');
  rpcEndpoint = defaultConfig.rpcEndpoint;
});

beforeEach(() => {
  chainService = new ChainService(rpcEndpoint, defaultConfig.serverPrivateKey, 50);
});

afterEach(() => chainService.destructor());

function fundChannel(
  expectedHeld: number,
  amount: number,
  channelId: string = randomChannelId()
): {
  channelId: string;
  request: Promise<providers.TransactionResponse>;
} {
  const request = chainService.fundChannel({
    channelId,
    assetHolderAddress: ethAssetHolderAddress,
    expectedHeld: BN.from(expectedHeld),
    amount: BN.from(amount),
  });
  return {channelId, request};
}

async function waitForChannelFunding(
  expectedHeld: number,
  amount: number,
  channelId: string = randomChannelId()
): Promise<string> {
  const request = await fundChannel(expectedHeld, amount, channelId).request;
  await request.wait();
  return channelId;
}

describe('fundChannel', () => {
  it('Successfully funds channel with 2 participants, rejects invalid 3rd', async () => {
    const channelId = await waitForChannelFunding(0, 5);
    await waitForChannelFunding(5, 5, channelId);

    const {request: fundChannelPromise} = fundChannel(5, 5, channelId);
    // todo: is there a good way to validate that the error thrown is one we expect?
    await expect(fundChannelPromise).rejects.toThrow();
  });
});

describe('registerChannel', () => {
  it('Successfully registers channel and receives follow on funding event', async () => {
    const channelId = randomChannelId();
    const wrongChannelId = randomChannelId();
    let counter = 0;

    await new Promise(resolve =>
      chainService.registerChannel(channelId, [ethAssetHolderAddress], {
        onHoldingUpdated: arg => {
          switch (counter) {
            case 0:
              expect(arg).toMatchObject({
                channelId,
                assetHolderAddress: ethAssetHolderAddress,
                amount: BN.from(0),
              });
              counter++;
              fundChannel(0, 5, wrongChannelId);
              fundChannel(0, 5, channelId);
              break;
            case 1:
              expect(arg).toMatchObject({
                channelId,
                assetHolderAddress: ethAssetHolderAddress,
                amount: BN.from(5),
              });
              counter++;
              resolve();
              break;
            default:
              throw new Error('Should not reach here');
          }
        },
      })
    );
  });

  it('Receives correct initial holding', async () => {
    const channelId = randomChannelId();
    await waitForChannelFunding(0, 5, channelId);

    await new Promise(resolve =>
      chainService.registerChannel(channelId, [ethAssetHolderAddress], {
        onHoldingUpdated: arg => {
          expect(arg).toMatchObject({
            channelId,
            assetHolderAddress: ethAssetHolderAddress,
            amount: BN.from(5),
          });
          resolve();
        },
      })
    );
  });
});
