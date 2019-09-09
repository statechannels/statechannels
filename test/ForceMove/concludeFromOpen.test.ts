import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../build/contracts/TESTForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../build/contracts/CountingApp.json';
import {keccak256, defaultAbiCoder} from 'ethers/utils';
import {
  setupContracts,
  sign,
  newConcludedEvent,
  clearedChallengeHash,
  ongoingChallengeHash,
  finalizedOutcomeHash,
  signStates,
  sendTransaction,
} from '../test-helpers';
import {HashZero, AddressZero} from 'ethers/constants';
import {Outcome, hashOutcome} from '../../src/outcome';
import {Channel, getChannelId} from '../../src/channel';
import {State, hashState, getFixedPart, hashAppPart} from '../../src/state';
import {Bytes32} from '../../src/types';
import {createConcludeFromOpenTransaction} from '../../src/force-move';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let ForceMove: ethers.Contract;
let networkId;
const chainId = '0x1234';
const participants = ['', '', ''];
const wallets = new Array(3);
const challengeDuration = '0x1000';
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
  'It accepts a valid concludeFromOpen tx (n states) and sets the channel storage correctly';
const description2 =
  'It accepts a valid concludeFromOpen tx (1 state) and sets the channel storage correctly';
const description3 =
  'It accepts a valid concludeFromOpen tx (1 state, cleared challenge exists) and sets the channel storage correctly';
const description4 =
  'It reverts a concludeFromOpen tx when the declaredTurnNumRecord = 0 and incorrect';
const description5 =
  'It reverts a concludeFromOpen tx when the declaredTurnNumRecord > 0 and incorrect';
const description6 = 'It reverts a concludeFromOpen tx when there is an ongoing challenge';
const description7 = 'It reverts a concludeFromOpen tx when the outcome is already finalized';

describe('concludeFromOpen', () => {
  it.each`
    description     | channelNonce | declaredTurnNumRecord | initialChannelStorageHash  | largestTurnNum | numStates | whoSignedWhat | reasonString
    ${description1} | ${401}       | ${0}                  | ${HashZero}                | ${8}           | ${3}      | ${[0, 1, 2]}  | ${undefined}
    ${description2} | ${402}       | ${0}                  | ${HashZero}                | ${8}           | ${1}      | ${[0, 0, 0]}  | ${undefined}
    ${description3} | ${403}       | ${5}                  | ${clearedChallengeHash(5)} | ${8}           | ${1}      | ${[0, 0, 0]}  | ${undefined}
    ${description4} | ${404}       | ${0}                  | ${clearedChallengeHash(5)} | ${8}           | ${1}      | ${[0, 0, 0]}  | ${'Channel is not open or turnNum does not match'}
    ${description5} | ${405}       | ${1}                  | ${clearedChallengeHash(5)} | ${8}           | ${1}      | ${[0, 0, 0]}  | ${'Channel is not open or turnNum does not match'}
    ${description6} | ${406}       | ${5}                  | ${ongoingChallengeHash(5)} | ${8}           | ${1}      | ${[0, 0, 0]}  | ${'Channel is not open or turnNum does not match'}
    ${description7} | ${407}       | ${5}                  | ${finalizedOutcomeHash(5)} | ${8}           | ${1}      | ${[0, 0, 0]}  | ${'Channel is not open or turnNum does not match'}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      channelNonce,
      declaredTurnNumRecord,
      initialChannelStorageHash,
      largestTurnNum,
      numStates,
      whoSignedWhat,
      reasonString,
    }) => {
      const channel: Channel = {chainId, participants, channelNonce};
      const channelId = getChannelId(channel);

      const states: State[] = [];
      for (let i = 1; i <= numStates; i++) {
        states.push({
          isFinal: true,
          channel,
          outcome,
          appDefinition,
          appData: '0x0',
          challengeDuration,
          turnNum: largestTurnNum + i - numStates,
        });
      }
      // call public wrapper to set state (only works on test contract)
      const tx = await ForceMove.setChannelStorageHash(channelId, initialChannelStorageHash);
      await tx.wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(initialChannelStorageHash);

      // sign the states
      const sigs = await signStates(states, wallets, whoSignedWhat);

      const transactionRequest = createConcludeFromOpenTransaction(
        declaredTurnNumRecord,
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
        const blockNumber = await provider.getBlockNumber();
        const blockTimestamp = (await provider.getBlock(blockNumber)).timestamp;
        const outcomeHash = hashOutcome(outcome);
        const expectedChannelStorage = [0, blockTimestamp, HashZero, AddressZero, outcomeHash];
        const expectedChannelStorageHash = keccak256(
          defaultAbiCoder.encode(
            ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
            expectedChannelStorage,
          ),
        );

        // check channelStorageHash against the expected value
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    },
  );
});
