import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../../build/contracts/CountingApp.json';
import {
  setupContracts,
  newConcludedEvent,
  clearedChallengeHash,
  ongoingChallengeHash,
  finalizedOutcomeHash,
  signStates,
  sendTransaction,
} from '../../test-helpers';
import {HashZero} from 'ethers/constants';
import {Outcome} from '../../../src/contract/outcome';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {State} from '../../../src/contract/state';
import {createConcludeTransaction} from '../../../src/contract/transaction-creators/force-move';
import {hashChannelStorage} from '../../../src/contract/channel-storage';
import {hexlify} from 'ethers/utils';
import {
  CHANNEL_FINALIZED,
  UNACCEPTABLE_WHO_SIGNED_WHAT,
} from '../../../src/contract/transaction-creators/revert-reasons';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let ForceMove: ethers.Contract;
let networkId;
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

const acceptsWhenOpenIf =
  'It accepts when the channel is open, and sets the channel storage correctly, if ';
const accepts1 = acceptsWhenOpenIf + 'passed n states, and the slot is empty';
const accepts2 = acceptsWhenOpenIf + 'passed one state, and the slot is empty';
const accepts3 = acceptsWhenOpenIf + 'the largestTurnNum is large enough';
const accepts6 = acceptsWhenOpenIf + 'the largest turn number is not large enough';
const accepts7 = acceptsWhenOpenIf + 'the largest turn number is not large enough';

const acceptsWhenChallengeOngoingIf =
  'It accepts when there is an ongoing challenge, and sets the channel storage correctly, if ';
const accepts4 = acceptsWhenChallengeOngoingIf + 'passed n states';
const accepts5 = acceptsWhenChallengeOngoingIf + 'passed one state';

const reverts1 = 'It reverts when the channel is open, but the final state is not supported';
const reverts2 =
  'It reverts when there is an ongoing challenge, but the final state is not supported';
const reverts3 = 'It reverts when the outcome is already finalized';

const threeStates = {
  whoSignedWhat: [0, 1, 2],
  appData: [0, 1, 2],
};
const oneState = {
  whoSignedWhat: [0, 0, 0],
  appData: [0],
};
const unsupported = {
  whoSignedWhat: [0, 0, 0],
  appData: [0, 1, 2],
};
const turnNumRecord = 5;
const channelOpen = clearedChallengeHash(turnNumRecord);
const challengeOngoing = ongoingChallengeHash(turnNumRecord);
const finalized = finalizedOutcomeHash(turnNumRecord);
const nParticipants = participants.length;
let channelNonce = 400;
describe('conclude', () => {
  beforeEach(() => (channelNonce += 1));
  it.each`
    description | initialChannelStorageHash | largestTurnNum                   | support        | reasonString
    ${accepts1} | ${HashZero}               | ${turnNumRecord - nParticipants} | ${threeStates} | ${undefined}
    ${accepts2} | ${HashZero}               | ${turnNumRecord - 1}             | ${oneState}    | ${undefined}
    ${accepts2} | ${HashZero}               | ${turnNumRecord + 1}             | ${oneState}    | ${undefined}
    ${accepts3} | ${channelOpen}            | ${turnNumRecord + 2}             | ${oneState}    | ${undefined}
    ${accepts4} | ${challengeOngoing}       | ${turnNumRecord + 3}             | ${oneState}    | ${undefined}
    ${accepts5} | ${challengeOngoing}       | ${turnNumRecord + 4}             | ${oneState}    | ${undefined}
    ${accepts6} | ${channelOpen}            | ${turnNumRecord - 1}             | ${oneState}    | ${undefined}
    ${accepts7} | ${challengeOngoing}       | ${turnNumRecord - 1}             | ${oneState}    | ${undefined}
    ${reverts1} | ${channelOpen}            | ${turnNumRecord + nParticipants} | ${unsupported} | ${UNACCEPTABLE_WHO_SIGNED_WHAT}
    ${reverts2} | ${challengeOngoing}       | ${turnNumRecord + nParticipants} | ${unsupported} | ${UNACCEPTABLE_WHO_SIGNED_WHAT}
    ${reverts3} | ${finalized}              | ${turnNumRecord + 1}             | ${oneState}    | ${CHANNEL_FINALIZED}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({initialChannelStorageHash, largestTurnNum, support, reasonString}) => {
      const channel: Channel = {chainId, participants, channelNonce: hexlify(channelNonce)};
      const channelId = getChannelId(channel);
      const {appData, whoSignedWhat} = support;
      const numStates = appData.length;

      const states: State[] = [];
      for (let i = 1; i <= numStates; i++) {
        states.push({
          isFinal: true,
          channel,
          outcome,
          appDefinition,
          appData,
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

      const transactionRequest = createConcludeTransaction(states, sigs, whoSignedWhat);
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
        const expectedChannelStorageHash = hashChannelStorage({
          turnNumRecord: 0,
          finalizesAt: blockTimestamp,
          outcome,
        });

        // check channelStorageHash against the expected value
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    },
  );
});
