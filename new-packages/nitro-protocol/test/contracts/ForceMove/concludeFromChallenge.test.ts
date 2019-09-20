import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../../build/contracts/CountingApp.json';
import {keccak256, defaultAbiCoder, bigNumberify} from 'ethers/utils';
import {
  setupContracts,
  newConcludedEvent,
  clearedChallengeHash,
  signStates,
  sendTransaction,
} from '../../test-helpers';
import {AddressZero} from 'ethers/constants';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {State, hashState} from '../../../src/contract/state';
import {Outcome, hashOutcome} from '../../../src/contract/outcome';
import {ChannelStorage, hashChannelStorage} from '../../../src/contract/channel-storage';
import {createConcludeFromChallengeTransaction} from '../../../src/contract/transaction-creators/force-move';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let ForceMove: ethers.Contract;
let networkId;
let blockNumber;
let blockTimestamp;
const chainId = '0x1234';
const participants = ['', '', ''];
const wallets = new Array(3);
const challengeDuration = 0x1000;
const assetHolderAddress = ethers.Wallet.createRandom().address;
const outcome: Outcome = [{assetHolderAddress, allocation: []}];
let appDefinition;

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}
beforeAll(async () => {
  ForceMove = await setupContracts(provider, ForceMoveArtifact);
  networkId = (await provider.getNetwork()).chainId;
  appDefinition = countingAppArtifact.networks[networkId].address; // use a fixed appDefinition in all tests
});

// Scenarios are synonymous with channelNonce:

const description1 =
  'It accepts a valid concludeFromChallenge tx (n states) and sets the channel storage correctly';
const description2 = 'It reverts a concludeFromChallenge tx when there is no ongoing challenge';
const description3 =
  'It reverts a concludeFromChallenge tx when there is no challenge ongoing (challenge cleared)';
const description4 = 'It reverts a concludeFromChallenge tx when the outcome is already finalized';

const turnNumRecord = 5;

describe('concludeFromChallenge', () => {
  it.each`
    description     | channelNonce | finalizesAt  | forceStorageHash           | declaredTurnNumRecord | largestTurnNum | numStates | whoSignedWhat | reasonString
    ${description1} | ${501}       | ${undefined} | ${undefined}               | ${5}                  | ${8}           | ${3}      | ${[0, 1, 2]}  | ${undefined}
    ${description3} | ${503}       | ${undefined} | ${clearedChallengeHash(5)} | ${5}                  | ${8}           | ${3}      | ${[0, 1, 2]}  | ${'Channel storage does not match stored version.'}
    ${description2} | ${502}       | ${1}         | ${undefined}               | ${4}                  | ${8}           | ${3}      | ${[0, 1, 2]}  | ${'Challenge expired or not present.'}
    ${description4} | ${504}       | ${0}         | ${undefined}               | ${5}                  | ${8}           | ${3}      | ${[0, 1, 2]}  | ${'Challenge expired or not present.'}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      channelNonce,
      finalizesAt,
      forceStorageHash,
      declaredTurnNumRecord,
      largestTurnNum,
      numStates,
      whoSignedWhat,
      reasonString,
    }) => {
      // compute channelId
      const channel: Channel = {chainId, participants, channelNonce};
      const challengeState: State = {
        channel,
        challengeDuration,
        turnNum: turnNumRecord,
        appDefinition,
        appData: '0x0',
        isFinal: false,
        outcome,
      };

      const channelId = getChannelId(channel);

      // set expiry time in the future or in the past
      blockNumber = await provider.getBlockNumber();
      blockTimestamp = (await provider.getBlock(blockNumber)).timestamp;
      finalizesAt = finalizesAt || blockTimestamp + bigNumberify(challengeDuration).toNumber();

      // compute expected ChannelStorageHash
      const challengerAddress = wallets[2].address;

      const challengeStateHash = hashState(challengeState);
      const outcomeHash = hashOutcome(outcome);

      const challengeExistsHash = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
          [turnNumRecord, finalizesAt, challengeStateHash, challengerAddress, outcomeHash],
        ),
      );

      // call public wrapper to set state (only works on test contract)
      const tx = await ForceMove.setChannelStorageHash(
        channelId,
        forceStorageHash ? forceStorageHash : challengeExistsHash,
      );
      await tx.wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(
        forceStorageHash ? forceStorageHash : challengeExistsHash,
      );

      // Create states
      const states: State[] = [];
      for (let i = 1; i <= numStates; i++) {
        states.push({
          turnNum: largestTurnNum + i - numStates,
          isFinal: true,
          channel,
          appDefinition,
          appData: '0x0',
          challengeDuration,
          outcome,
        });
      }

      const sigs = await signStates(states, wallets, whoSignedWhat);
      const transactionRequest = createConcludeFromChallengeTransaction(
        declaredTurnNumRecord,
        challengeState,
        finalizesAt,
        states,
        sigs,
        whoSignedWhat,
      );
      // call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () => sendTransaction(provider, ForceMove.address, transactionRequest),
          regex,
        );
      } else {
        const concludedEvent: any = newConcludedEvent(ForceMove, channelId);
        await sendTransaction(provider, ForceMove.address, transactionRequest);

        // catch Concluded event
        const [eventChannelId] = await concludedEvent;
        expect(eventChannelId).toBeDefined();

        // compute expected ChannelStorageHash
        blockNumber = await provider.getBlockNumber();
        blockTimestamp = (await provider.getBlock(blockNumber)).timestamp;
        const expectedChannelStorage: ChannelStorage = {
          turnNumRecord: 0x0,
          finalizesAt: blockTimestamp,
          challengerAddress: AddressZero,
          outcome,
        };
        const expectedChannelStorageHash = hashChannelStorage(expectedChannelStorage);

        // check channelStorageHash against the expected value

        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    },
  );
});
