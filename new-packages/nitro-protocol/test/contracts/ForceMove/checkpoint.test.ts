import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../../build/contracts/CountingApp.json';
import {defaultAbiCoder, hexlify} from 'ethers/utils';
import {
  setupContracts,
  newChallengeClearedEvent,
  signStates,
  sendTransaction,
} from '../../test-helpers';
import {HashZero, Zero} from 'ethers/constants';
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
const challengeDuration = 0x1000;
const assetHolderAddress = ethers.Wallet.createRandom().address;
const defaultOutcome: Outcome = [{assetHolderAddress, allocation: []}];
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
  reason: 'Channel storage does not match stored version.',
};
const challengeExpired = {
  description: 'It reverts when the challenge has expired',
  reason: 'Challenge expired',
};
const invalidTransition = {
  description: 'It reverts when the states do not form a validTransition chain ',
  reason: 'CountingApp: Counter must be incremented',
};
const stateUnsupported = {
  description: 'It reverts when an unacceptable whoSignedWhat array is submitted',
  reason: 'Unacceptable whoSignedWhat array',
};
const staleState = {
  description: 'It reverts when the turnNumRecord is not increasted.',
  reason: 'turnNumRecord not increased.',
};
const succeedsDuringChallenge = {
  description:
    'It accepts when the input is valid and there is a challenge, and clears the challenge',
};
const succeedsWhenChannelOpen = {
  description: 'It accepts when the input is valid and the channel is open',
};

describe('checkpoint', () => {
  // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
  let cn = 300;
  it.each`
    test                       | channelNonce | turnNumRecord | largestTurnNum | appDatas     | whoSignedWhat | challenger    | channelStorage | finalizesAt
    ${succeedsDuringChallenge} | ${(cn += 1)} | ${7}          | ${8}           | ${[0, 1, 2]} | ${[0, 1, 2]}  | ${wallets[1]} | ${undefined}   | ${undefined}
    ${succeedsDuringChallenge} | ${(cn += 1)} | ${7}          | ${11}          | ${[0, 1, 2]} | ${[0, 1, 2]}  | ${wallets[1]} | ${undefined}   | ${undefined}
    ${succeedsWhenChannelOpen} | ${(cn += 1)} | ${7}          | ${11}          | ${[0, 1, 2]} | ${[0, 1, 2]}  | ${wallets[1]} | ${undefined}   | ${'0x00'}
    ${hashMisMatch}            | ${(cn += 1)} | ${7}          | ${11}          | ${[0, 1, 2]} | ${[0, 1, 2]}  | ${wallets[2]} | ${HashZero}    | ${undefined}
    ${challengeExpired}        | ${(cn += 1)} | ${7}          | ${11}          | ${[0, 1, 2]} | ${[0, 1, 2]}  | ${wallets[2]} | ${undefined}   | ${1}
    ${invalidTransition}       | ${(cn += 1)} | ${7}          | ${8}           | ${[0, 2, 1]} | ${[0, 1, 2]}  | ${wallets[1]} | ${undefined}   | ${undefined}
    ${stateUnsupported}        | ${(cn += 1)} | ${7}          | ${8}           | ${[0, 1, 2]} | ${[0, 0, 2]}  | ${wallets[1]} | ${undefined}   | ${undefined}
    ${staleState}              | ${(cn += 1)} | ${10}         | ${8}           | ${[0, 1, 2]} | ${[0, 1, 2]}  | ${wallets[1]} | ${undefined}   | ${undefined}
  `(
    '$test.description',
    async ({
      channelNonce,
      turnNumRecord,
      largestTurnNum,
      appDatas,
      whoSignedWhat,
      challenger,
      channelStorage,
      finalizesAt,
      test,
    }) => {
      // compute channelId
      const channel: Channel = {chainId, channelNonce, participants};
      const channelId = getChannelId(channel);

      finalizesAt = finalizesAt || 1e12;

      const states = appDatas.map((data, idx) => ({
        turnNum: largestTurnNum - appDatas.length + 1 + idx,
        isFinal: false,
        channel,
        challengeDuration,
        outcome: defaultOutcome,
        appData: defaultAbiCoder.encode(['uint256'], [data]),
        appDefinition,
      }));

      const isOpen = Zero.eq(finalizesAt);
      const outcome = isOpen ? undefined : defaultOutcome;
      const challengerAddress = isOpen ? undefined : challenger.address;
      const challengeState: State = isOpen
        ? undefined
        : {
            turnNum: turnNumRecord,
            isFinal: false,
            channel,
            outcome,
            appData: defaultAbiCoder.encode(['uint256'], [appDatas[0]]),
            appDefinition,
            challengeDuration,
          };

      channelStorage =
        channelStorage ||
        hashChannelStorage({
          turnNumRecord,
          finalizesAt,
          state: challengeState,
          challengerAddress,
          outcome,
        });

      // call public wrapper to set state (only works on test contract)
      const tx = await ForceMove.setChannelStorageHash(channelId, channelStorage);
      await tx.wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(channelStorage);

      const signatures = await signStates(states, wallets, whoSignedWhat);

      const transactionsRequest = createCheckpointTransaction({
        challengeState,
        finalizesAt,
        states,
        signatures,
        whoSignedWhat,
        turnNumRecord,
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
          turnNumRecord: largestTurnNum,
          finalizesAt: 0x0,
        });

        // check channelStorageHash against the expected value
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    },
  );
});
