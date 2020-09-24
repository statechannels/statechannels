import {randomChannelId} from '@statechannels/nitro-protocol';
import {BN} from '@statechannels/wallet-core';
import {Wallet} from 'ethers';

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
    const assetHolderAddress = Wallet.createRandom().address;
    const request = await chainService.fundChannel({
      channelId,
      assetHolderAddress,
      expectedHeld: BN.from(0),
      amount: BN.from(0),
    });
    const receipt = request.wait();
    expect((await receipt).status).toBe(1);
  });
});
