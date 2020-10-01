// @ts-ignore

import { Contract, Wallet, utils } from 'ethers';
const { id, keccak256 } = utils;

import AssetHolderArtifact from '../../../build/contracts/TestEthAssetHolder.json';
import { Channel, getChannelId } from '../../../src/contract/channel';
import { getTestProvider, setupContracts } from '../../test-helpers';

const provider = getTestProvider();
let AssetHolder: Contract;
let channelId;

const participants = ['', '', ''];
const wallets = new Array(3);
const chainId = '0x1234';
const channelNonce = 0x9999;
const outcomeContent = id('some outcome data');

// Populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  AssetHolder = await setupContracts(
    provider,
    AssetHolderArtifact,
    process.env.TEST_ETH_ASSET_HOLDER_ADDRESS
  );
  const channel: Channel = { chainId, participants, channelNonce };
  channelId = getChannelId(channel);
});

describe('setOutcome', () => {
  it('Reverts when called directly from an EOA', async () => {
    const reasonString = 'Only the NitroAdjudicator is authorized';
    const regex = new RegExp(
      '(' + 'VM Exception while processing transaction: revert ' + reasonString + ')'
    );
    await expect(
      AssetHolder.setAssetOutcomeHash(channelId, keccak256(outcomeContent))
    ).rejects.toThrow(regex);
  });
});
