import {expectRevert} from '@statechannels/devtools';
import {Contract, Wallet} from 'ethers';
import {HashZero} from 'ethers/constants';
import {bigNumberify, defaultAbiCoder, hexlify} from 'ethers/utils';
// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {channelDataToChannelStorageHash} from '../../../src/contract/channel-storage';
import {Outcome} from '../../../src/contract/outcome';
import {State} from '../../../src/contract/state';
import {checkpointArgs} from '../../../src/contract/transaction-creators/force-move';
import {
  CHANNEL_FINALIZED,
  TURN_NUM_RECORD_NOT_INCREASED,
  UNACCEPTABLE_WHO_SIGNED_WHAT,
} from '../../../src/contract/transaction-creators/revert-reasons';
import {COUNTING_APP_INVALID_TRANSITION} from '../../revert-reasons';
import {getPlaceHolderContractAddress, getTestProvider, setupContracts} from '../../test-helpers';
import {signStates} from '../../../src';

const provider = getTestProvider();
let ForceMove: Contract;
const chainId = '0x1234';
const participants = ['', '', ''];
const wallets = new Array(3);
const challengeDuration = 0x1000;
const assetHolderAddress = Wallet.createRandom().address;
const defaultOutcome: Outcome = [{assetHolderAddress, allocationItems: []}];
let appDefinition;

// Populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}
beforeAll(async () => {
  ForceMove = await setupContracts(
    provider,
    ForceMoveArtifact,
    process.env.TEST_FORCE_MOVE_ADDRESS
  );
  appDefinition = getPlaceHolderContractAddress();
});

const valid = {
  whoSignedWhat: [0, 0, 0],
  appDatas: [0],
};
const invalidTransition = {
  whoSignedWhat: [0, 1, 2],
  appDatas: [0, 2, 1],
};
const unsupported = {
  whoSignedWhat: [0, 0, 0],
  appDatas: [0, 1, 2],
};

const itOpensTheChannelIf = 'It accepts valid input, and clears any existing challenge, if';
const accepts1 = itOpensTheChannelIf + 'the slot is empty';
const accepts2 =
  itOpensTheChannelIf + 'there is a challenge and the existing turnNumRecord is increased';
const accepts3 =
  itOpensTheChannelIf + 'there is no challenge and the existing turnNumRecord is increased';

const itRevertsWhenOpenBut = 'It reverts when the channel is open, but ';
const reverts1 = itRevertsWhenOpenBut + 'the turnNumRecord is not increased.';
const reverts2 = itRevertsWhenOpenBut + 'there is an invalid transition';
const reverts3 = itRevertsWhenOpenBut + 'the final state is not supported';

const itRevertsWithChallengeBut = 'It reverts when there is an ongoing challenge, but ';
const reverts4 = itRevertsWithChallengeBut + 'the turnNumRecord is not increased.';
const reverts5 = itRevertsWithChallengeBut + 'there is an invalid transition';
const reverts6 = itRevertsWithChallengeBut + 'the final state is not supported';

const reverts7 = 'It reverts when a challenge has expired';

const future = 1e12;
const past = 1;
const never = '0x00';
const turnNumRecord = 7;

describe('checkpoint', () => {
  let channelNonce = 300;
  beforeEach(() => (channelNonce += 1));
  it.each`
    description | largestTurnNum       | support              | challenger    | finalizesAt  | reason
    ${accepts1} | ${turnNumRecord + 1} | ${valid}             | ${wallets[1]} | ${undefined} | ${undefined}
    ${accepts2} | ${turnNumRecord + 3} | ${valid}             | ${wallets[1]} | ${never}     | ${undefined}
    ${accepts3} | ${turnNumRecord + 4} | ${valid}             | ${wallets[1]} | ${future}    | ${undefined}
    ${reverts1} | ${turnNumRecord}     | ${valid}             | ${wallets[1]} | ${never}     | ${TURN_NUM_RECORD_NOT_INCREASED}
    ${reverts2} | ${turnNumRecord + 1} | ${invalidTransition} | ${wallets[1]} | ${never}     | ${COUNTING_APP_INVALID_TRANSITION}
    ${reverts3} | ${turnNumRecord + 1} | ${unsupported}       | ${wallets[1]} | ${never}     | ${UNACCEPTABLE_WHO_SIGNED_WHAT}
    ${reverts4} | ${turnNumRecord}     | ${valid}             | ${wallets[1]} | ${future}    | ${TURN_NUM_RECORD_NOT_INCREASED}
    ${reverts5} | ${turnNumRecord + 1} | ${invalidTransition} | ${wallets[1]} | ${future}    | ${COUNTING_APP_INVALID_TRANSITION}
    ${reverts6} | ${turnNumRecord + 1} | ${unsupported}       | ${wallets[1]} | ${future}    | ${UNACCEPTABLE_WHO_SIGNED_WHAT}
    ${reverts7} | ${turnNumRecord + 1} | ${valid}             | ${wallets[1]} | ${past}      | ${CHANNEL_FINALIZED}
  `('$description', async ({largestTurnNum, support, challenger, finalizesAt, reason}) => {
    const {appDatas, whoSignedWhat} = support;
    const channel: Channel = {chainId, channelNonce: hexlify(channelNonce), participants};
    const channelId = getChannelId(channel);

    const states = appDatas.map((data, idx) => ({
      turnNum: largestTurnNum - appDatas.length + 1 + idx,
      isFinal: false,
      channel,
      challengeDuration,
      outcome: defaultOutcome,
      appData: defaultAbiCoder.encode(['uint256'], [data]),
      appDefinition,
    }));

    const isOpen = !!finalizesAt;
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

    const channelStorageHashes = finalizesAt
      ? channelDataToChannelStorageHash({
          turnNumRecord,
          finalizesAt,
          state: challengeState,
          challengerAddress,
          outcome,
        })
      : HashZero;

    // Call public wrapper to set state (only works on test contract)
    await (await ForceMove.setChannelStorageHash(channelId, channelStorageHashes)).wait();
    expect(await ForceMove.channelStorageHashes(channelId)).toEqual(channelStorageHashes);

    const signatures = await signStates(states, wallets, whoSignedWhat);

    const tx = ForceMove.checkpoint(...checkpointArgs({states, signatures, whoSignedWhat}));
    if (reason) {
      await expectRevert(() => tx, reason);
    } else {
      const receipt = await (await tx).wait();
      const event = receipt.events.pop();
      expect(event.args).toMatchObject({
        channelId,
        newTurnNumRecord: bigNumberify(largestTurnNum),
      });

      const expectedChannelStorageHash = channelDataToChannelStorageHash({
        turnNumRecord: largestTurnNum,
        finalizesAt: 0x0,
      });

      // Check channelStorageHash against the expected value
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
    }
  });
});
