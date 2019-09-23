import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../../build/contracts/CountingApp.json';
import {defaultAbiCoder, hexlify} from 'ethers/utils';
import {setupContracts, sign, newChallengeClearedEvent, sendTransaction} from '../../test-helpers';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {State, hashState} from '../../../src/contract/state';
import {Outcome} from '../../../src/contract/outcome';
import {hashChannelStorage, ChannelStorage} from '../../../src/contract/channel-storage';
import {createRefuteTransaction} from '../../../src/contract/transaction-creators/force-move';

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

const description1 = 'It accepts a refute tx for an ongoing challenge';
const description2 = 'It reverts a refute tx if the challenge has expired';
const description3 = 'It reverts a refute tx if the declaredTurnNumRecord is incorrect';
const description4 =
  'It reverts a refute tx if the refutation state is not signed by the challenger';
const description5 =
  'It reverts a refute tx if the refutationTurnNum is not larger than declaredTurnNumRecord';

describe('refute', () => {
  it.each`
    description     | channelNonce | setTurnNumRecord | declaredTurnNumRecord | refutationTurnNum | expired  | isFinalAB         | appDatas  | challenger    | refutationStateSigner | reasonString
    ${description1} | ${1001}      | ${8}             | ${8}                  | ${14}             | ${false} | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[2]}         | ${undefined}
    ${description2} | ${1002}      | ${8}             | ${8}                  | ${14}             | ${true}  | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[2]}         | ${'Challenge expired or not present.'}
    ${description3} | ${1003}      | ${8}             | ${7}                  | ${14}             | ${false} | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[2]}         | ${'Channel storage does not match stored version.'}
    ${description4} | ${1004}      | ${8}             | ${8}                  | ${14}             | ${false} | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${nonParticipant}     | ${'Refutation state not signed by challenger'}
    ${description5} | ${1001}      | ${8}             | ${8}                  | ${5}              | ${false} | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[2]}         | ${'Refutation state must have a higher turn number'}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      channelNonce,
      setTurnNumRecord,
      declaredTurnNumRecord,
      refutationTurnNum,
      expired,
      isFinalAB,
      appDatas,
      challenger,
      refutationStateSigner,
      reasonString,
    }) => {
      const channel: Channel = {chainId, channelNonce, participants};
      const channelId = getChannelId(channel);
      const challengeState: State = {
        turnNum: setTurnNumRecord,
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

      // set expiry time in the future or in the past
      const blockNumber = await provider.getBlockNumber();
      const blockTimestamp = (await provider.getBlock(blockNumber)).timestamp;
      const finalizesAt = expired
        ? blockTimestamp - challengeDuration
        : blockTimestamp + challengeDuration;

      // compute expected ChannelStorageHash

      const challengeExistsHash = hashChannelStorage({
        turnNumRecord: setTurnNumRecord,
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
        declaredTurnNumRecord,
        finalizesAt,
        challengeState,
        refutationState,
        refutationStateSig,
      );
      if (reasonString) {
        expectRevert(() => {
          return sendTransaction(provider, ForceMove.address, transactionRequest);
        }, 'VM Exception while processing transaction: revert ' + reasonString);
      } else {
        const challengeClearedEvent: any = newChallengeClearedEvent(ForceMove, channelId);

        await sendTransaction(provider, ForceMove.address, transactionRequest);

        // catch ChallengeCleared event
        const [, eventTurnNumRecord] = await challengeClearedEvent;
        expect(eventTurnNumRecord._hex).toEqual(hexlify(declaredTurnNumRecord));

        // check new expected ChannelStorageHash
        const expectedChannelStorage: ChannelStorage = {
          turnNumRecord: declaredTurnNumRecord,
          finalizesAt: 0,
        };
        const expectedChannelStorageHash = hashChannelStorage(expectedChannelStorage);
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    },
  );
});
