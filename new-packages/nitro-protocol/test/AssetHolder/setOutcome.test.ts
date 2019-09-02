import {ethers} from 'ethers';
// @ts-ignore
import AssetHolderArtifact from '../../build/contracts/ETHAssetHolder.json';
import {setupContracts} from '../test-helpers';
import {keccak256, defaultAbiCoder} from 'ethers/utils';
import {expectRevert} from 'magmo-devtools';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let AssetHolder: ethers.Contract;
let channelId;

const participants = ['', '', ''];
const wallets = new Array(3);
const chainId = 1234;
const channelNonce = 9999;
const outcomeContent = ethers.utils.id('some outcome data');

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  AssetHolder = await setupContracts(provider, AssetHolderArtifact);
  channelId = keccak256(
    defaultAbiCoder.encode(
      ['uint256', 'address[]', 'uint256'],
      [chainId, participants, channelNonce],
    ),
  );
});

describe('setOutcome', () => {
  it('Reverts when called directly from an EOA', async () => {
    const reasonString = 'Only the NitroAdjudicator is authorized';
    const regex = new RegExp(
      '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
    );
    await expectRevert(() => AssetHolder.setOutcome(channelId, keccak256(outcomeContent)), regex);
  });
});
