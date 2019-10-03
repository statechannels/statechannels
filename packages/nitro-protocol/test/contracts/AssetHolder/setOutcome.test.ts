// @ts-ignore
import AssetHolderArtifact from '../../../build/contracts/ETHAssetHolder.json';
import {setupContracts, getTestProvider} from '../../test-helpers';
import {keccak256, id} from 'ethers/utils';
import {expectRevert} from '@statechannels/devtools';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {Contract, Wallet} from 'ethers';

const provider = getTestProvider();
let AssetHolder: Contract;
let channelId;

const participants = ['', '', ''];
const wallets = new Array(3);
const chainId = '0x1234';
const channelNonce = '0x9999';
const outcomeContent = id('some outcome data');

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  AssetHolder = await setupContracts(provider, AssetHolderArtifact);
  const channel: Channel = {chainId, participants, channelNonce};
  channelId = getChannelId(channel);
});

describe('setOutcome', () => {
  it('Reverts when called directly from an EOA', async () => {
    const reasonString = 'Only the NitroAdjudicator is authorized';
    const regex = new RegExp(
      '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
    );
    await expectRevert(
      () => AssetHolder.setAssetOutcomeHash(channelId, keccak256(outcomeContent)),
      regex,
    );
  });
});
