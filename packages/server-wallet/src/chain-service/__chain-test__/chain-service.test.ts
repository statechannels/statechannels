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

    const mock = jest.fn();
    const subscriber = {setFunding: mock};
    chainService.registerChannel(channelId, [ethAssetHolderAddress], subscriber);

    // First, fund a different channel id to see if our listener picks up the event for this channelId
    await (
      await chainService.fundChannel({
        channelId: wrongChannelId,
        assetHolderAddress: ethAssetHolderAddress,
        expectedHeld: BN.from(0),
        amount: BN.from(5),
      })
    ).wait();

    await (
      await chainService.fundChannel({
        channelId,
        assetHolderAddress: ethAssetHolderAddress,
        expectedHeld: BN.from(0),
        amount: BN.from(5),
      })
    ).wait();
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(mock).toHaveBeenCalledWith({
      channelId,
      assetHolderAddress: ethAssetHolderAddress,
      amount: BN.from(5),
    });
  });
});
