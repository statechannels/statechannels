import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../build/contracts/TESTForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../build/contracts/CountingApp.json';
import {keccak256, defaultAbiCoder, hexlify, bigNumberify} from 'ethers/utils';
import {
  setupContracts,
  sign,
  newChallengeClearedEvent,
  signStates,
  sendTransaction,
} from '../test-helpers';
import {AddressZero} from 'ethers/constants';
import {Outcome} from '../../src/outcome';
import {Channel, getChannelId} from '../../src/channel';
import {State} from '../../src/state';
import {hashChannelStorage} from '../../src/channel-storage';
import {createRespondWithAlternativeTransaction} from '../../src/force-move';

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

const description1 = 'It accepts a valid respondWithAlternative tx and clears the challenge';
const description2 =
  'It reverts a respondWithAlternative tx when largestTurnNum =/= setTurnNum + 1';
const description3 = 'It reverts a respondWithAlternative tx for an expired challenge';
const description4 =
  'It reverts a respondWithAlternative tx when the states do not form a validTransition chain ';
const description5 =
  'It reverts a respondWithAlternative tx when an unacceptable whoSignedWhat array is submitted';

describe('respondWithAlternative', () => {
  it.each`
    description     | channelNonce | setTurnNumRecord | expired  | largestTurnNum | appDatas     | isFinalCount | whoSignedWhat | challenger    | reasonString
    ${description1} | ${301}       | ${7}             | ${false} | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[1]} | ${undefined}
    ${description2} | ${302}       | ${8}             | ${false} | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[2]} | ${'Challenge State does not match stored version'}
    ${description3} | ${303}       | ${8}             | ${true}  | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[2]} | ${'Response too late!'}
    ${description4} | ${304}       | ${7}             | ${false} | ${8}           | ${[0, 2, 1]} | ${0}         | ${[0, 1, 2]}  | ${wallets[1]} | ${'CountingApp: Counter must be incremented'}
    ${description5} | ${305}       | ${7}             | ${false} | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 0, 2]}  | ${wallets[1]} | ${'Unacceptable whoSignedWhat array'}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      channelNonce,
      setTurnNumRecord,
      expired,
      largestTurnNum,
      appDatas,
      isFinalCount,
      whoSignedWhat,
      challenger,
      reasonString,
    }) => {
      // compute channelId
      const channel: Channel = {chainId, channelNonce, participants};
      const channelId = getChannelId(channel);

      const challengeState: State = {
        turnNum: setTurnNumRecord,
        isFinal: false,
        channel,
        outcome,
        appData: defaultAbiCoder.encode(['uint256'], [appDatas[0]]),
        appDefinition,
        challengeDuration,
      };

      const states: State[] = [];

      for (let i = 0; i < appDatas.length; i++) {
        states.push({
          turnNum: largestTurnNum - appDatas.length + 1 + i,
          isFinal: i > appDatas.length - isFinalCount,
          channel,
          challengeDuration,
          outcome,
          appData: defaultAbiCoder.encode(['uint256'], [appDatas[i]]),
          appDefinition,
        });
      }

      // set expiry time in the future or in the past
      const blockNumber = await provider.getBlockNumber();
      const blockTimestamp = (await provider.getBlock(blockNumber)).timestamp;
      const finalizesAt = expired
        ? bigNumberify(blockTimestamp)
            .sub(challengeDuration)
            .toHexString()
        : bigNumberify(blockTimestamp)
            .add(challengeDuration)
            .toHexString();

      const challengeExistsHash = hashChannelStorage({
        largestTurnNum: setTurnNumRecord,
        finalizesAt,
        state: challengeState,
        challengerAddress: challenger.address,
        outcome,
      });

      // call public wrapper to set state (only works on test contract)
      const tx = await ForceMove.setChannelStorageHash(channelId, challengeExistsHash);
      await tx.wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(challengeExistsHash);

      // sign the states
      const sigs = await signStates(states, wallets, whoSignedWhat);

      const transactionsRequest = createRespondWithAlternativeTransaction(
        challengeState,
        finalizesAt,
        states,
        sigs,
        whoSignedWhat,
      );
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () => sendTransaction(provider, ForceMove.address, transactionsRequest),
          regex,
        );
      } else {
        const challengeClearedEvent: any = newChallengeClearedEvent(ForceMove, channelId);

        await sendTransaction(provider, ForceMove.address, transactionsRequest);

        // catch ChallengeCleared event
        const [_, eventTurnNumRecord] = await challengeClearedEvent;
        expect(eventTurnNumRecord._hex).toEqual(hexlify(largestTurnNum));

        const expectedChannelStorageHash = hashChannelStorage({
          largestTurnNum,
          finalizesAt: '0x0',
          challengerAddress: AddressZero,
        });

        // check channelStorageHash against the expected value
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    },
  );
});
