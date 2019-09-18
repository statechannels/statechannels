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
import {AddressZero, HashZero} from 'ethers/constants';
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

const hashMisMatch = {
  description: "It reverts when the channel storage doesn't match",
  reason: 'Challenge State does not match stored version',
  channelStorageBytesHash: HashZero,
};

const challengeExpired = {
  description: 'It reverts when the challenge has expired',
  reason: 'Challenge timed out',
  finalizesAt: 1,
};
const invalidSupport = {
  description: 'It reverts when the states do not form a validTransition chain ',
  reason: 'CountingApp: Counter must be incremented',
};
const stateUnsupported = {
  description: 'It reverts when an unacceptable whoSignedWhat array is submitted',
  reason: 'Unacceptable whoSignedWhat array',
};
const staleState = {
  description: 'It reverts when the turnNumRecord is not increased',
  reason: 'turnNumRecord not increased',
};
const succeeds = {
  description: 'It accepts when the input is valid, and clears the challenge',
};

describe('checkpoint', () => {
  // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
  let cn = 300;
  it.each`
    test                | channelNonce | setTurnNumRecord | largestTurnNum | appDatas     | whoSignedWhat | challenger
    ${succeeds}         | ${(cn += 1)} | ${7}             | ${8}           | ${[0, 1, 2]} | ${[0, 1, 2]}  | ${wallets[1]}
    ${succeeds}         | ${(cn += 1)} | ${7}             | ${11}          | ${[0, 1, 2]} | ${[0, 1, 2]}  | ${wallets[1]}
    ${hashMisMatch}     | ${(cn += 1)} | ${7}             | ${11}          | ${[0, 1, 2]} | ${[0, 1, 2]}  | ${wallets[2]}
    ${challengeExpired} | ${(cn += 1)} | ${7}             | ${11}          | ${[0, 1, 2]} | ${[0, 1, 2]}  | ${wallets[2]}
    ${invalidSupport}   | ${(cn += 1)} | ${7}             | ${8}           | ${[0, 2, 1]} | ${[0, 1, 2]}  | ${wallets[1]}
    ${stateUnsupported} | ${(cn += 1)} | ${7}             | ${8}           | ${[0, 1, 2]} | ${[0, 0, 2]}  | ${wallets[1]}
    ${staleState}       | ${(cn += 1)} | ${10}            | ${8}           | ${[0, 1, 2]} | ${[0, 1, 2]}  | ${wallets[1]}
  `(
    '$test.description',
    async ({
      channelNonce,
      setTurnNumRecord,
      largestTurnNum,
      appDatas,
      whoSignedWhat,
      challenger,
      test,
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
          isFinal: false,
          channel,
          challengeDuration,
          outcome,
          appData: defaultAbiCoder.encode(['uint256'], [appDatas[i]]),
          appDefinition,
        });
      }

      // compute finalizedAt
      const blockNumber = await provider.getBlockNumber();
      const blockTimestamp = (await provider.getBlock(blockNumber)).timestamp;
      const finalizesAt =
        test.finalizesAt ||
        bigNumberify(blockTimestamp)
          .add(challengeDuration)
          .toHexString();

      const challengeExistsHash =
        test.channelStorageBytesHash ||
        hashChannelStorage({
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

      const signatures = await signStates(states, wallets, whoSignedWhat);

      const transactionsRequest = createCheckpointTransaction({
        challengeState,
        finalizesAt,
        states,
        signatures,
        whoSignedWhat,
        turnNumRecord: setTurnNumRecord,
      });
      if (test.reason) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + test.reason + '$',
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
