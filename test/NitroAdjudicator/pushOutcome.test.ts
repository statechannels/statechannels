import {ethers} from 'ethers';
// @ts-ignore
import NitroAdjudicatorArtifact from '../../build/contracts/TESTNitroAdjudicator.json';
// @ts-ignore
import ETHAssetHolderArtifact from '../../build/contracts/ETHAssetHolder.json';
// @ts-ignore
import ERC20AssetHolderArtifact from '../../build/contracts/ERC20AssetHolder.json';

import {keccak256, defaultAbiCoder, toUtf8Bytes} from 'ethers/utils';
import {AddressZero} from 'ethers/constants';
import {setupContracts, finalizedOutcomeHash} from '../test-helpers';
import {expectRevert} from 'magmo-devtools';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let NitroAdjudicator: ethers.Contract;
let ETHAssetHolder: ethers.Contract;
let ERC20AssetHolder: ethers.Contract;

// constants for this test suite
const challengerAddress = AddressZero;
const chainId = 1234;
const participants = ['', '', ''];
const wallets = new Array(3);
const outcomeContent = ethers.utils.id('some outcome data'); // just some bytes for now. To actually mean anything, must be properly encoded data
let outcome;
let outcomeHash;
const stateHash = keccak256(defaultAbiCoder.encode(['bytes'], [toUtf8Bytes('mocked state data')]));

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
      // compute channelId
      const channelId = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'address[]', 'uint256'],
          [chainId, participants, channelNonce],
        ),
      );

      const finalizesAt = finalized ? 1 : 1e12; // either 1 second after genesis block, or ~ 31000 years after

      const assetOutcomeBytes1 = defaultAbiCoder.encode(
        ['tuple(address, bytes)'],
        [[ETHAssetHolder.address, outcomeContent]],
      );
      const assetOutcomeBytes2 = defaultAbiCoder.encode(
        ['tuple(address, bytes)'],
        [[ERC20AssetHolder.address, outcomeContent]],
      );
      outcome = defaultAbiCoder.encode(['bytes[]'], [[assetOutcomeBytes1, assetOutcomeBytes2]]); // use a fixed outcome for all state updates in all tests
      outcomeHash = keccak256(outcome);

      const initialChannelStorageHash = finalizedOutcomeHash(
        storedTurnNumRecord,
        finalizesAt,
        stateHash,
        challengerAddress,
        outcomeHash,
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
          stateHash,
          challengerAddress,
          outcome,
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
              stateHash,
              challengerAddress,
              outcome,
            ),
          regex,
        );
      } else {
        const tx2 = await NitroAdjudicator.pushOutcome(
          channelId,
          declaredTurnNumRecord,
          finalizesAt,
          stateHash,
          challengerAddress,
          outcome,
        );
        // wait for tx to be mined
        await tx2.wait();
        // check 2x AssetHolder storage against the expected value
        expect(await ETHAssetHolder.outcomeHashes(channelId)).toEqual(keccak256(outcomeContent));
        expect(await ERC20AssetHolder.outcomeHashes(channelId)).toEqual(keccak256(outcomeContent));
      }
    },
  );
});
