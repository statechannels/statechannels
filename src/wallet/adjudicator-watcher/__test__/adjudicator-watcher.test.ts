import { ethers } from 'ethers';
import { channelID } from 'fmg-core/lib/channel';
import { depositContract, channel } from './utils';

jest.setTimeout(60000);

describe('adjudicator listener', () => {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(
    `http://localhost:${process.env.DEV_GANACHE_PORT}`,
  );

  beforeAll(async () => {
    // This is a work around for https://github.com/ethers-io/ethers.js/issues/393
    // We manually create a transaction to force a block to be mined in ganache so that events get properly caught
    // otherwise the first event is always missed since ethers won't listen for events until a block has been mined
    await depositContract(provider, channelID(channel));
  });

  it('should handle a funds received event when registered for that channel', async () => {
    await depositContract(provider, channelID(channel));
  });
});
