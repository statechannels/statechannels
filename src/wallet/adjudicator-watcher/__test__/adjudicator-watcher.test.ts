import { ethers } from 'ethers';
import { channelID } from 'fmg-core/lib/channel';
import { depositContract, channel } from './utils';

jest.setTimeout(60000);

describe('adjudicator listener', () => {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(
    `http://localhost:${process.env.DEV_GANACHE_PORT}`,
  );

  it('should handle a funds received event when registered for that channel', async () => {
    await depositContract(provider, channelID(channel));
  });
});
