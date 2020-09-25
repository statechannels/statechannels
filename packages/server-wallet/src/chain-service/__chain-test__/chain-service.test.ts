import {randomChannelId} from '@statechannels/nitro-protocol';
import {BN} from '@statechannels/wallet-core';

import {defaultConfig} from '../../config';
import {ChainService} from '../chain-service';

let rpcEndpoint: string;
beforeAll(() => {
  if (!defaultConfig.rpcEndpoint) throw new Error('rpc endpoint must be defined');
  rpcEndpoint = defaultConfig.rpcEndpoint;
});
describe('fundChannel', () => {
  it('Successfully funds channel', async () => {
    const chainService = new ChainService(rpcEndpoint, defaultConfig.serverPrivateKey);
    const channelId = randomChannelId();
    /* eslint-disable-next-line no-process-env, @typescript-eslint/no-non-null-assertion */
    const assetHolderAddress = process.env.ETH_ASSET_HOLDER_ADDRESS!;
    const request = await chainService.fundChannel({
      channelId,
      assetHolderAddress,
      expectedHeld: BN.from(0),
      amount: BN.from(5),
    });
    const receipt = request.wait();
    expect((await receipt).status).toBe(1);

    const request2 = await chainService.fundChannel({
      channelId,
      assetHolderAddress,
      expectedHeld: BN.from(5),
      amount: BN.from(5),
    });
    const receipt2 = request2.wait();
    expect((await receipt2).status).toBe(1);

    const fundChannelPromise = chainService.fundChannel({
      channelId,
      assetHolderAddress,
      expectedHeld: BN.from(5),
      amount: BN.from(5),
    });
    // todo: is there a good way to validate that the error thrown is one we expect?
    await expect(fundChannelPromise).rejects.toThrow();
  });
});
