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
import {CHANNEL_NOT_OPEN} from '../../../src/contract/transaction-creators/revert-reasons.js';

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
  'It accepts when the channel is open, and sets the channel storage correctly, if';
const description1 = acceptsWhenOpenIf + 'passed n states, and the slot is empty';
const description2 = acceptsWhenOpenIf + 'passed one state, and the slot is empty';
const description3 = acceptsWhenOpenIf + 'passed one state, and there is a turnNumRecord stored';

const revertsWhenOpenBut = 'It reverts when the channel is open, but';
const description4 = revertsWhenOpenBut + 'the declaredTurnNumRecord = 0 and incorrect';
const description5 = revertsWhenOpenBut + 'the declaredTurnNumRecord > 0 and incorrect';

const description6 = 'It reverts when there is an ongoing challenge';
const description7 = 'It reverts when the outcome is already finalized';

const largestTurnNum = 8;
describe('concludeFromOpen', () => {
  const whoSignedWhatLookup = {
    1: [0, 0, 0],
    3: [0, 1, 2],
  };
  let channelNonce = 400;
  beforeEach(() => (channelNonce += 1));
  it.each`
    description     | initialChannelStorageHash  | numStates | reasonString
    ${description1} | ${HashZero}                | ${3}      | ${undefined}
    ${description2} | ${HashZero}                | ${1}      | ${undefined}
    ${description3} | ${clearedChallengeHash(5)} | ${1}      | ${undefined}
    ${description4} | ${clearedChallengeHash(5)} | ${1}      | ${'generic'}
    ${description5} | ${clearedChallengeHash(5)} | ${1}      | ${'generic'}
    ${description6} | ${ongoingChallengeHash(5)} | ${1}      | ${CHANNEL_NOT_OPEN}
    ${description7} | ${finalizedOutcomeHash(5)} | ${1}      | ${CHANNEL_NOT_OPEN}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({initialChannelStorageHash, numStates, reasonString}) => {
      const channel: Channel = {chainId, participants, channelNonce: hexlify(channelNonce)};
      const channelId = getChannelId(channel);
      const whoSignedWhat = whoSignedWhatLookup[numStates];

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
