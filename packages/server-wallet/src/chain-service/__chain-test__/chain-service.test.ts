import {randomChannelId} from '@statechannels/nitro-protocol';
import {BN} from '@statechannels/wallet-core';

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

describe('fundChannel', () => {
  it('Successfully funds channel with 2 participants, rejects invalid 3rd', async () => {
    const channelId = randomChannelId();
    const request = await chainService.fundChannel({
      channelId,
      assetHolderAddress: ethAssetHolderAddress,
      expectedHeld: BN.from(0),
      amount: BN.from(5),
    });
    const receipt = request.wait();
    expect((await receipt).status).toBe(1);

    const request2 = await chainService.fundChannel({
      channelId,
      assetHolderAddress: ethAssetHolderAddress,
      expectedHeld: BN.from(5),
      amount: BN.from(5),
    });
    const receipt2 = request2.wait();
    expect((await receipt2).status).toBe(1);

    const fundChannelPromise = chainService.fundChannel({
      channelId,
      assetHolderAddress: ethAssetHolderAddress,
      expectedHeld: BN.from(5),
      amount: BN.from(5),
    });
    // todo: is there a good way to validate that the error thrown is one we expect?
    await expect(fundChannelPromise).rejects.toThrow();
  });
});

describe('registerChannel', () => {
  it('Successfully registers channel and receives funding event', async () => {
    const channelId = randomChannelId();
    const wrongChannelId = randomChannelId();
    let counter = 0;

    await new Promise(resolve =>
      chainService.registerChannel(channelId, [ethAssetHolderAddress], {
        setFunding: arg => {
          switch (counter) {
            case 0:
              expect(arg).toMatchObject({
                channelId,
                assetHolderAddress: ethAssetHolderAddress,
                amount: BN.from(0),
              });
              counter++;
              chainService.fundChannel({
                channelId: wrongChannelId,
                assetHolderAddress: ethAssetHolderAddress,
                expectedHeld: BN.from(0),
                amount: BN.from(5),
              });
              chainService.fundChannel({
                channelId,
                assetHolderAddress: ethAssetHolderAddress,
                expectedHeld: BN.from(0),
                amount: BN.from(5),
              });
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
});
