import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../../build/contracts/CountingApp.json';
import {defaultAbiCoder, hexlify} from 'ethers/utils';
import {setupContracts, newChallengeClearedEvent, sign, sendTransaction} from '../../test-helpers';
import {Outcome} from '../../../src/contract/outcome';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {State, hashState} from '../../../src/contract/state';
import {hashChannelStorage} from '../../../src/contract/channel-storage';
import {createRespondTransaction} from '../../../src/contract/transaction-creators/force-move';
import {
  NO_ONGOING_CHALLENGE,
  WRONG_CHANNEL_STORAGE,
  RESPONSE_UNAUTHORIZED,
} from '../../../src/contract/transaction-creators/revert-reasons';
import {HashZero} from 'ethers/constants';

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
const nonParticipant = ethers.Wallet.createRandom();

beforeAll(async () => {
  ForceMove = await setupContracts(provider, ForceMoveArtifact);
  networkId = (await provider.getNetwork()).chainId;
  appDefinition = countingAppArtifact.networks[networkId].address; // use a fixed appDefinition in all tests
});

// Scenarios are synonymous with channelNonce:

const description1 = 'It accepts a respond tx for an ongoing challenge';
const description2 = 'It reverts a respond tx if the challenge has expired';
const description3 = 'It reverts a respond tx if the channel storage does not match';
const description4 = 'It reverts a respond tx if it is not signed by the correct participant';
const description5 =
  'It reverts a respond tx if the response state is not a validTransition from the challenge state';

describe('respond', () => {
  const turnNumRecord = 8;
  let channelNonce = 1000;
  const future = 1e12;
  const past = 1;
  beforeEach(() => (channelNonce += 1));
  it.each`
    description     | finalizesAt | slotEmpty | isFinalAB         | appDatas  | challenger    | responder         | reasonString
    ${description1} | ${future}   | ${false}  | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[0]}     | ${undefined}
    ${description2} | ${past}     | ${false}  | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[0]}     | ${NO_ONGOING_CHALLENGE}
    ${description3} | ${future}   | ${true}   | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[0]}     | ${WRONG_CHANNEL_STORAGE}
    ${description4} | ${future}   | ${false}  | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${nonParticipant} | ${RESPONSE_UNAUTHORIZED}
    ${description5} | ${future}   | ${false}  | ${[false, false]} | ${[0, 0]} | ${wallets[2]} | ${wallets[0]}     | ${'CountingApp: Counter must be incremented'}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({isFinalAB, appDatas, challenger, responder, finalizesAt, slotEmpty, reasonString}) => {
      const channel: Channel = {chainId, channelNonce: hexlify(channelNonce), participants};
      const channelId = getChannelId(channel);

      const challengeState: State = {
        turnNum: turnNumRecord,
        isFinal: isFinalAB[0],
        channel,
        outcome,
        appData: defaultAbiCoder.encode(['uint256'], [appDatas[0]]),
        appDefinition,
        challengeDuration,
      };

      const responseState: State = {
        turnNum: turnNumRecord + 1,
        isFinal: isFinalAB[1],
        channel,
        outcome,
        appData: defaultAbiCoder.encode(['uint256'], [appDatas[1]]),
        appDefinition,
        challengeDuration,
      };
      const responseStateHash = hashState(responseState);

      const challengeExistsHash = slotEmpty
        ? HashZero
        : hashChannelStorage({
            turnNumRecord,
            finalizesAt,
            state: challenger ? challengeState : undefined,
            challengerAddress: challenger.address,
            outcome,
          });

      // call public wrapper to set state (only works on test contract)
      const tx = await ForceMove.setChannelStorageHash(channelId, challengeExistsHash);
      await tx.wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(challengeExistsHash);

      // sign the state
      const signature = await sign(responder, responseStateHash);

      const transactionRequest = createRespondTransaction(challengeState, responseState, signature);

      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () => sendTransaction(provider, ForceMove.address, transactionRequest),
          regex,
        );
      } else {
        const challengeClearedEvent: any = newChallengeClearedEvent(ForceMove, channelId);

        await sendTransaction(provider, ForceMove.address, transactionRequest);

        // catch ChallengeCleared event
        const [, eventTurnNumRecord] = await challengeClearedEvent;
        expect(eventTurnNumRecord._hex).toEqual(hexlify(turnNumRecord + 1));

        // compute and check new expected ChannelStorageHash

        const expectedChannelStorageHash = hashChannelStorage({
          turnNumRecord: turnNumRecord + 1,
          finalizesAt: 0,
        });
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    },
  );
});
