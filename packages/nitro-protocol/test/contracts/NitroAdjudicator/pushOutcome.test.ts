import {expectRevert} from '@statechannels/devtools';
import {Contract, Wallet, ethers, BigNumber} from 'ethers';

import ERC20AssetHolderArtifact from '../../../artifacts/contracts/test/TestErc20AssetHolder.sol/TestErc20AssetHolder.json';
import ETHAssetHolderArtifact from '../../../artifacts/contracts/test/TestEthAssetHolder.sol/TestEthAssetHolder.json';
import NitroAdjudicatorArtifact from '../../../artifacts/contracts/test/TESTNitroAdjudicator.sol/TESTNitroAdjudicator.json';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {hashAssetOutcome} from '../../../src/contract/outcome';
import {State} from '../../../src/contract/state';
import {
  CHANNEL_NOT_FINALIZED,
  WRONG_CHANNEL_STORAGE,
} from '../../../src/contract/transaction-creators/revert-reasons';
import {createPushOutcomeTransaction, NITRO_MAX_GAS} from '../../../src/transactions';
import {
  finalizedOutcomeHash,
  getRandomNonce,
  getTestProvider,
  largeOutcome,
  sendTransaction,
  setupContracts,
} from '../../test-helpers';
import {PushOutcomeTransactionArg} from '../../../src/contract/transaction-creators/nitro-adjudicator';

const provider = getTestProvider();
let TestNitroAdjudicator: Contract;
let ETHAssetHolder: Contract;
let ERC20AssetHolder: Contract;

// Constants for this test suite

const chainId = process.env.CHAIN_NETWORK_ID;
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

const description00 =
  'TestNitroAdjudicator accepts a pushOutcome tx for a concluded channel, and 1x AssetHolder storage updated correctly';
const description0 =
  'TestNitroAdjudicator accepts a pushOutcome tx for a finalized channel, and 1x AssetHolder storage updated correctly';
// NOTE ABOUT PUSHING A LARGE OUTCOME
// We run our tests against ganache, which cannot seem to handle a pushOutcome transaction with 2000
// allocation items (it consumes excessive memory). This is despite the tx being less than 128KB
// However, such an outcome was pushed successfully on rinkeby https://rinkeby.etherscan.io/tx/0xcc892796857ea8d52d88ed747dd587a91cfd172d384b79f42cfc583f047f6f55
// It consumed 2,054,158 gas
// This test falls back to 100 allocation items.
const description1 =
  'TestNitroAdjudicator accepts a pushOutcome tx for a finalized channel, and 2x AssetHolder storage updated correctly with 100 allocationItems';
const description2 = 'TestNitroAdjudicator rejects a pushOutcome tx for a not-finalized channel';
const description3 =
  'TestNitroAdjudicator rejects a pushOutcome tx when declaredTurnNumRecord is incorrect';
const description4 = 'AssetHolders reject a setOutcome when outcomeHash already exists';

describe('pushOutcome', () => {
  let channelNonce = getRandomNonce('pushOutcome');
  afterEach(() => {
    channelNonce++;
  });
  it.each`
    description      | wasConcluded | storedTurnNumRecord | declaredTurnNumRecord | finalized | outcomeHashExits | numAllocations | reasonString
    ${description00} | ${true}      | ${5}                | ${5}                  | ${true}   | ${false}         | ${[2, 2]}      | ${undefined}
    ${description0}  | ${false}     | ${5}                | ${5}                  | ${true}   | ${false}         | ${[2, 2]}      | ${undefined}
    ${description1}  | ${false}     | ${5}                | ${5}                  | ${true}   | ${false}         | ${[100, 0]}    | ${undefined}
    ${description2}  | ${false}     | ${5}                | ${5}                  | ${false}  | ${false}         | ${[2, 2]}      | ${CHANNEL_NOT_FINALIZED}
    ${description3}  | ${false}     | ${4}                | ${5}                  | ${true}   | ${false}         | ${[2, 2]}      | ${WRONG_CHANNEL_STORAGE}
    ${description4}  | ${false}     | ${5}                | ${5}                  | ${true}   | ${true}          | ${[2, 2]}      | ${'Outcome hash already exists'}
  `(
    '$description', // For the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      wasConcluded,
      storedTurnNumRecord,
      declaredTurnNumRecord,
      finalized,
      outcomeHashExits,
      numAllocations,
      reasonString,
    }) => {
      const channel: Channel = {chainId, channelNonce, participants};
      const channelId = getChannelId(channel);
      const finalizesAt = finalized ? 1 : 1e12; // Either 1 second after unix epoch, or ~ 31000 years after

      const outcome = [
        ...largeOutcome(numAllocations[0], ETHAssetHolder.address),
        ...largeOutcome(numAllocations[1], ERC20AssetHolder.address),
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
        wasConcluded ? 0 : storedTurnNumRecord,
        finalizesAt,
        outcome,
        wasConcluded ? undefined : state,
        wasConcluded ? undefined : challengerAddress
      );

      // Use public wrapper to set state (only works on test contract)
      const txRequest = {
        data: TestNitroAdjudicator.interface.encodeFunctionData('setChannelStorageHash', [
          channelId,
          initialChannelStorageHash,
        ]),
      };
      await sendTransaction(provider, TestNitroAdjudicator.address, txRequest);

      const tx = await TestNitroAdjudicator.setChannelStorageHash(
        channelId,
        initialChannelStorageHash
      );
      await tx.wait();
      expect(await TestNitroAdjudicator.channelStorageHashes(channelId)).toEqual(
        initialChannelStorageHash
      );

      let arg: PushOutcomeTransactionArg = {
        turnNumRecord: wasConcluded ? 0 : declaredTurnNumRecord,
        finalizesAt,
        state,
        outcome,
        channelWasConcluded: wasConcluded,
      };
      if (!wasConcluded) {
        arg = {...arg, challengerAddress: participants[state.turnNum % participants.length]};
      }

      const transactionRequest = createPushOutcomeTransaction(arg);

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
        const receipt = await sendTransaction(
          provider,
          TestNitroAdjudicator.address,
          transactionRequest
        );
        // Ensure we aren't using too much gas
        expect(BigNumber.from(receipt.gasUsed).lt(BigNumber.from(NITRO_MAX_GAS))).toBe(true);
        // Check 2x AssetHolder storage against the expected value
        if (outcome[0]) {
          expect(await ETHAssetHolder.assetOutcomeHashes(channelId)).toEqual(
            hashAssetOutcome(outcome[0].allocationItems)
          );
        }
        if (outcome[1]) {
          expect(await ERC20AssetHolder.assetOutcomeHashes(channelId)).toEqual(
            hashAssetOutcome(outcome[1].allocationItems)
          );
        }
      }
    }
  );
});
