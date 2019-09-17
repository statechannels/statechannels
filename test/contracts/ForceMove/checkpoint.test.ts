import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../../build/contracts/CountingApp.json';
import {defaultAbiCoder, hexlify, bigNumberify} from 'ethers/utils';
import {
  setupContracts,
  newChallengeClearedEvent,
  signStates,
  sendTransaction,
} from '../../test-helpers';
import {AddressZero} from 'ethers/constants';
import {Outcome} from '../../../src/contract/outcome';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {State} from '../../../src/contract/state';
import {hashChannelStorage} from '../../../src/contract/channel-storage';
import {createCheckpointTransaction} from '../../../src/contract/transaction-creators/force-move';

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

const description1 = 'It accepts when the input is valid, and clears the challenge';
const description2 = 'It reverts when largestTurnNum =/= setTurnNum + 1';
const description3 = 'It reverts when the challenge has expired';
const description4 = 'It reverts when the states do not form a validTransition chain ';
const description5 = 'It reverts when an unacceptable whoSignedWhat array is submitted';
const description6 = 'It reverts when the turnNumRecord is not increased';

describe('checkpoint', () => {
  let cn = 300;
  it.each`
    description     | channelNonce | setTurnNumRecord | expired  | largestTurnNum | appDatas     | isFinalCount | whoSignedWhat | challenger    | reasonString
    ${description1} | ${(cn += 1)} | ${7}             | ${false} | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[1]} | ${undefined}
    ${description1} | ${(cn += 1)} | ${7}             | ${false} | ${11}          | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[1]} | ${undefined}
    ${description2} | ${(cn += 1)} | ${8}             | ${false} | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[2]} | ${'Challenge State does not match stored version'}
    ${description3} | ${(cn += 1)} | ${8}             | ${true}  | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[2]} | ${'Response too late!'}
    ${description4} | ${(cn += 1)} | ${7}             | ${false} | ${8}           | ${[0, 2, 1]} | ${0}         | ${[0, 1, 2]}  | ${wallets[1]} | ${'CountingApp: Counter must be incremented'}
    ${description5} | ${(cn += 1)} | ${7}             | ${false} | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 0, 2]}  | ${wallets[1]} | ${'Unacceptable whoSignedWhat array'}
    ${description6} | ${(cn += 1)} | ${7}             | ${false} | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[1]} | ${'turnNumRecord not increased'}
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

      const transactionsRequest = createCheckpointTransaction(
        challengeState,
        finalizesAt,
        states,
        sigs,
        whoSignedWhat,
        setTurnNumRecord,
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
        const [, eventTurnNumRecord] = await challengeClearedEvent;
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
