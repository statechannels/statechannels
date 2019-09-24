import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../../build/contracts/CountingApp.json';
import {defaultAbiCoder, hexlify} from 'ethers/utils';
import {
  setupContracts,
  sign,
  newChallengeClearedEvent,
  sendTransaction,
  nonParticipant,
} from '../../test-helpers';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {State, hashState} from '../../../src/contract/state';
import {Outcome} from '../../../src/contract/outcome';
import {hashChannelStorage, ChannelStorage} from '../../../src/contract/channel-storage';
import {createRefuteTransaction} from '../../../src/contract/transaction-creators/force-move';
import {
  NO_ONGOING_CHALLENGE,
  WRONG_CHANNEL_STORAGE,
  TURN_NUM_RECORD_NOT_INCREASED,
  WRONG_REFUTATION_SIGNATURE,
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
  appDefinition = countingAppArtifact.networks[networkId].address;
});

const description1 = 'It accepts if there is an ongoing challenge';
const description2 = 'It reverts if the challenge has expired';
const description3 = 'It reverts if the declaredTurnNumRecord is incorrect';
const description4 = 'It reverts if the refutation state is not signed by the challenger';
const description5 = 'It reverts if the refutationTurnNum is not larger than declaredTurnNumRecord';
const description6 = 'It reverts if the channel is open';

describe('refute', () => {
  const claimedRecord = 8;
  const future = 1e12;
  const past = 1;
  const never = '0x00';
  const isFinalAB = [false, false];
  const appDatas = [0, 1];
  const challenger = wallets[2];

  let channelNonce = 1000;
  beforeEach(() => (channelNonce += 1));
  it.each`
    description     | turnNumRecord        | refutationTurnNum    | finalizesAt | refutationStateSigner | reasonString
    ${description1} | ${claimedRecord}     | ${claimedRecord + 6} | ${future}   | ${challenger}         | ${undefined}
    ${description2} | ${claimedRecord}     | ${claimedRecord + 6} | ${past}     | ${challenger}         | ${NO_ONGOING_CHALLENGE}
    ${description4} | ${claimedRecord}     | ${claimedRecord + 6} | ${future}   | ${nonParticipant}     | ${WRONG_REFUTATION_SIGNATURE}
    ${description5} | ${claimedRecord}     | ${claimedRecord - 4} | ${future}   | ${challenger}         | ${TURN_NUM_RECORD_NOT_INCREASED}
    ${description6} | ${claimedRecord}     | ${claimedRecord + 6} | ${never}    | ${challenger}         | ${NO_ONGOING_CHALLENGE}
    ${description3} | ${claimedRecord + 1} | ${claimedRecord + 6} | ${future}   | ${challenger}         | ${WRONG_CHANNEL_STORAGE}
  `(
    '$description',
    async ({
      turnNumRecord,
      refutationTurnNum,
      finalizesAt,
      refutationStateSigner,
      reasonString,
    }) => {
      const channel: Channel = {chainId, channelNonce: hexlify(channelNonce), participants};
      const channelId = getChannelId(channel);
      const challengeState: State = {
        turnNum: claimedRecord,
        isFinal: isFinalAB[0],
        appData: defaultAbiCoder.encode(['uint256'], [appDatas[0]]),
        outcome,
        challengeDuration,
        channel,
        appDefinition,
      };

      const refutationState: State = {
        turnNum: refutationTurnNum,
        isFinal: isFinalAB[1],
        channel,
        appData: defaultAbiCoder.encode(['uint256'], [appDatas[0]]),
        outcome,
        appDefinition,
        challengeDuration,
      };

      const challengeExistsHash = hashChannelStorage({
        turnNumRecord,
        finalizesAt,
        state: challengeState,
        challengerAddress: challenger.address,
        outcome,
      });

      // call public wrapper to set state (only works on test contract)
      const tx = await ForceMove.setChannelStorageHash(channelId, challengeExistsHash);
      await tx.wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(challengeExistsHash);

      // sign the state
      const signature = await sign(refutationStateSigner, hashState(refutationState));
      const refutationStateSig = {v: signature.v, r: signature.r, s: signature.s};
      const transactionRequest = createRefuteTransaction(
        challengeState,
        refutationState,
        refutationStateSig,
      );
      if (reasonString) {
        await expectRevert(() => {
          return sendTransaction(provider, ForceMove.address, transactionRequest);
        }, 'VM Exception while processing transaction: revert ' + reasonString);
      } else {
        const challengeClearedEvent: any = newChallengeClearedEvent(ForceMove, channelId);

        await sendTransaction(provider, ForceMove.address, transactionRequest);

        // catch ChallengeCleared event
        const [, eventTurnNumRecord] = await challengeClearedEvent;
        expect(eventTurnNumRecord._hex).toEqual(hexlify(claimedRecord));

        // check new expected ChannelStorageHash
        const expectedChannelStorage: ChannelStorage = {
          turnNumRecord: claimedRecord,
          finalizesAt: 0,
        };
        const expectedChannelStorageHash = hashChannelStorage(expectedChannelStorage);
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    },
  );
});
