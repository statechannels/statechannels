// @ts-ignore
// @ts-ignore
import {expectRevert} from '@statechannels/devtools';
import {Contract, Wallet, ethers} from 'ethers';

import ERC20AssetHolderArtifact from '../../../build/contracts/TestErc20AssetHolder.json';
// @ts-ignore
import ETHAssetHolderArtifact from '../../../build/contracts/TestEthAssetHolder.json';
import NitroAdjudicatorArtifact from '../../../build/contracts/TESTNitroAdjudicator.json';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {AllocationAssetOutcome, hashAssetOutcome} from '../../../src/contract/outcome';
import {State} from '../../../src/contract/state';
import {createPushOutcomeTransaction} from '../../../src/contract/transaction-creators/nitro-adjudicator';
import {
  CHANNEL_NOT_FINALIZED,
  WRONG_CHANNEL_STORAGE,
} from '../../../src/contract/transaction-creators/revert-reasons';
import {
  finalizedOutcomeHash,
  getTestProvider,
  randomExternalDestination,
  sendTransaction,
  setupContracts,
} from '../../test-helpers';

const provider = getTestProvider();
let TestNitroAdjudicator: Contract;
let ETHAssetHolder: Contract;
let ERC20AssetHolder: Contract;

// Constants for this test suite

const chainId = '0x1234';
const participants = ['', '', ''];
const wallets = new Array(3);

// Populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}
beforeAll(async () => {
  TestNitroAdjudicator = await setupContracts(
    provider,
    NitroAdjudicatorArtifact,
    process.env.TEST_NITRO_ADJUDICATOR_ADDRESS
  );
  ETHAssetHolder = await setupContracts(
    provider,
    ETHAssetHolderArtifact,
    process.env.TEST_ETH_ASSET_HOLDER_ADDRESS
  );
  ERC20AssetHolder = await setupContracts(
    provider,
    ERC20AssetHolderArtifact,
    process.env.TEST_TOKEN_ASSET_HOLDER_ADDRESS
  );
});

// Scenarios are synonymous with channelNonce:

const description1 =
  'TestNitroAdjudicator accepts a pushOutcome tx for a finalized channel, and 2x AssetHolder storage updated correctly';
const description2 = 'TestNitroAdjudicator rejects a pushOutcome tx for a not-finalized channel';
const description3 =
  'TestNitroAdjudicator rejects a pushOutcome tx when declaredTurnNumRecord is incorrect';
const description4 = 'AssetHolders reject a setOutcome when outcomeHash already exists';

describe('pushOutcome', () => {
  it.each`
    description     | channelNonce | storedTurnNumRecord | declaredTurnNumRecord | finalized | outcomeHashExits | reasonString
    ${description1} | ${1101}      | ${5}                | ${5}                  | ${true}   | ${false}         | ${undefined}
    ${description2} | ${1102}      | ${5}                | ${5}                  | ${false}  | ${false}         | ${CHANNEL_NOT_FINALIZED}
    ${description3} | ${1103}      | ${4}                | ${5}                  | ${true}   | ${false}         | ${WRONG_CHANNEL_STORAGE}
    ${description4} | ${1104}      | ${5}                | ${5}                  | ${true}   | ${true}          | ${'Outcome hash already exists'}
  `(
    '$description', // For the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
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
      const finalizesAt = finalized ? 1 : 1e12; // Either 1 second after unix epoch, or ~ 31000 years after

      const A = randomExternalDestination();
      const B = randomExternalDestination();
      const C = randomExternalDestination();
      const D = randomExternalDestination();

      const outcome: AllocationAssetOutcome[] = [
        {
          assetHolderAddress: ETHAssetHolder.address,
          allocationItems: [
            {destination: A, amount: '1'},
            {destination: B, amount: '2'},
          ],
        },
        {
          assetHolderAddress: ERC20AssetHolder.address,
          allocationItems: [
            {destination: C, amount: '3'},
            {destination: D, amount: '4'},
          ],
        },
      ];

      // We don't care about the actual values in the state
      const state: State = {
        turnNum: 0,
        isFinal: false,
        channel,
        outcome,
        appDefinition: ethers.constants.AddressZero,
        appData: '0x00',
        challengeDuration: 0x1,
      };

      const challengerAddress = participants[state.turnNum % participants.length];

      const initialChannelStorageHash = finalizedOutcomeHash(
        storedTurnNumRecord,
        finalizesAt,
        outcome,
        state,
        challengerAddress
      );

      // Call public wrapper to set state (only works on test contract)
      const tx = await TestNitroAdjudicator.setChannelStorageHash(
        channelId,
        initialChannelStorageHash
      );
      await tx.wait();
      expect(await TestNitroAdjudicator.channelStorageHashes(channelId)).toEqual(
        initialChannelStorageHash
      );
      const transactionRequest = createPushOutcomeTransaction(
        declaredTurnNumRecord,
        finalizesAt,
        state,
        outcome
      );

      if (outcomeHashExits) {
        await sendTransaction(provider, TestNitroAdjudicator.address, transactionRequest);
      }

      // Call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '(' + 'VM Exception while processing transaction: revert ' + reasonString + ')'
        );
        await expectRevert(
          () => sendTransaction(provider, TestNitroAdjudicator.address, transactionRequest),
          regex
        );
      } else {
        await sendTransaction(provider, TestNitroAdjudicator.address, transactionRequest);
        // Check 2x AssetHolder storage against the expected value
        expect(await ETHAssetHolder.assetOutcomeHashes(channelId)).toEqual(
          hashAssetOutcome(outcome[0].allocationItems)
        );
        expect(await ERC20AssetHolder.assetOutcomeHashes(channelId)).toEqual(
          hashAssetOutcome(outcome[1].allocationItems)
        );
      }
    }
  );
});
