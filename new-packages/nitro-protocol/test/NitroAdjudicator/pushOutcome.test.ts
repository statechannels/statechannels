import {ethers} from 'ethers';
// @ts-ignore
import NitroAdjudicatorArtifact from '../../build/contracts/TESTNitroAdjudicator.json';
// @ts-ignore
import ETHAssetHolderArtifact from '../../build/contracts/ETHAssetHolder.json';
// @ts-ignore
import ERC20AssetHolderArtifact from '../../build/contracts/ERC20AssetHolder.json';

import {AddressZero} from 'ethers/constants';
import {setupContracts, finalizedOutcomeHash} from '../test-helpers';
import {expectRevert} from 'magmo-devtools';
import {Channel, getChannelId} from '../../src/channel';
import {
  Outcome,
  hashOutcome,
  AllocationOutcome,
  encodeOutcome,
  hashOutcomeContent,
} from '../../src/outcome';
import {State, hashState} from '../../src/state';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let NitroAdjudicator: ethers.Contract;
let ETHAssetHolder: ethers.Contract;
let ERC20AssetHolder: ethers.Contract;

// constants for this test suite
const challengerAddress = AddressZero;
const chainId = '0x1234';
const participants = ['', '', ''];
const wallets = new Array(3);

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  NitroAdjudicator = await setupContracts(provider, NitroAdjudicatorArtifact);
  ETHAssetHolder = await setupContracts(provider, ETHAssetHolderArtifact);
  ERC20AssetHolder = await setupContracts(provider, ERC20AssetHolderArtifact);
});

// Scenarios are synonymous with channelNonce:

const description1 =
  'NitroAdjudicator accepts a pushOutcome tx for a finalized channel, and 2x AssetHolder storage updated correctly';
const description2 = 'NitroAdjudicator rejects a pushOutcome tx for a not-finalized channel';
const description3 =
  'NitroAdjudicator rejects a pushOutcome tx when declaredTurnNumRecord is incorrect';
const description4 = 'AssetHolders reject a setOutcome when outcomeHash already exists';

describe('pushOutcome', () => {
  it.each`
    description     | channelNonce | storedTurnNumRecord | declaredTurnNumRecord | finalized | outcomeHashExits | reasonString
    ${description1} | ${1101}      | ${5}                | ${5}                  | ${true}   | ${false}         | ${undefined}
    ${description2} | ${1102}      | ${5}                | ${5}                  | ${false}  | ${false}         | ${'Outcome is not final'}
    ${description3} | ${1103}      | ${4}                | ${5}                  | ${true}   | ${false}         | ${'Submitted data does not match storage'}
    ${description4} | ${1104}      | ${5}                | ${5}                  | ${true}   | ${true}          | ${'Outcome hash already exists'}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      channelNonce,
      storedTurnNumRecord,
      declaredTurnNumRecord,
      finalized,
      outcomeHashExits,
      reasonString,
    }) => {
      const channel: Channel = {chainId, channelNonce, participants};
      const channelId = getChannelId(channel);
      const finalizesAt = finalized ? 1 : 1e12; // either 1 second after genesis block, or ~ 31000 years after

      const outcome = [
        {assetHolderAddress: ETHAssetHolder.address, allocation: []},
        {assetHolderAddress: ERC20AssetHolder.address, allocation: []},
      ];

      // We don't care about the actual values in the state
      const state: State = {
        turnNum: 0,
        isFinal: false,
        channel,
        outcome,
        appDefinition: AddressZero,
        appData: '0x0',
        challengeDuration: '0x1',
      };

      const initialChannelStorageHash = finalizedOutcomeHash(
        storedTurnNumRecord,
        finalizesAt,
        challengerAddress,
        state,
        outcome,
      );
      // call public wrapper to set state (only works on test contract)
      const tx = await NitroAdjudicator.setChannelStorageHash(channelId, initialChannelStorageHash);
      await tx.wait();
      expect(await NitroAdjudicator.channelStorageHashes(channelId)).toEqual(
        initialChannelStorageHash,
      );

      if (outcomeHashExits) {
        await (await NitroAdjudicator.pushOutcome(
          channelId,
          declaredTurnNumRecord,
          finalizesAt,
          hashState(state),
          challengerAddress,
          encodeOutcome(outcome),
        )).wait();
      }

      // call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () =>
            NitroAdjudicator.pushOutcome(
              channelId,
              declaredTurnNumRecord,
              finalizesAt,
              hashState(state),
              challengerAddress,
              encodeOutcome(outcome),
            ),
          regex,
        );
      } else {
        const tx2 = await NitroAdjudicator.pushOutcome(
          channelId,
          declaredTurnNumRecord,
          finalizesAt,
          hashState(state),
          challengerAddress,
          encodeOutcome(outcome),
        );
        // wait for tx to be mined
        await tx2.wait();
        // check 2x AssetHolder storage against the expected value
        expect(await ETHAssetHolder.outcomeHashes(channelId)).toEqual(
          hashOutcomeContent(outcome[0].allocation),
        );
        expect(await ERC20AssetHolder.outcomeHashes(channelId)).toEqual(
          hashOutcomeContent(outcome[1].allocation),
        );
      }
    },
  );
});
