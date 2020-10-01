import { ethers, Contract, Wallet } from 'ethers';
const { HashZero } = ethers.constants;

// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
import { Channel, getChannelId } from '../../../src/contract/channel';
import { channelDataToChannelStorageHash } from '../../../src/contract/channel-storage';
import { Outcome } from '../../../src/contract/outcome';
import { State } from '../../../src/contract/state';
import { concludeArgs } from '../../../src/contract/transaction-creators/force-move';
import {
  CHANNEL_FINALIZED,
  UNACCEPTABLE_WHO_SIGNED_WHAT,
} from '../../../src/contract/transaction-creators/revert-reasons';
import {
  clearedChallengeHash,
  finalizedOutcomeHash,
  getPlaceHolderContractAddress,
  getTestProvider,
  ongoingChallengeHash,
  setupContracts,
} from '../../test-helpers';
import { signStates } from '../../../src';

const provider = getTestProvider();
let ForceMove: Contract;
const chainId = '0x1234';
const participants = ['', '', ''];
const wallets = new Array(3);
const challengeDuration = 0x1000;
const assetHolderAddress = Wallet.createRandom().address;
const outcome: Outcome = [{ assetHolderAddress, allocationItems: [] }];
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

const acceptsWhenOpenIf =
  'It accepts when the channel is open, and sets the channel storage correctly, if ';
const accepts1 = acceptsWhenOpenIf + 'passed n states, and the slot is empty';
const accepts2 = acceptsWhenOpenIf + 'passed one state, and the slot is empty';
const accepts3 = acceptsWhenOpenIf + 'the largestTurnNum is large enough';
const accepts6 =
  acceptsWhenOpenIf + 'despite the largest turn number being less than turnNumRecord';
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
  appData: [HashZero, HashZero, HashZero],
};
const oneState = {
  whoSignedWhat: [0, 0, 0],
  appData: [HashZero],
};
const unsupported = {
  whoSignedWhat: [0, 0, 0],
  appData: [HashZero, HashZero, HashZero],
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
    '$description', // For the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({ initialChannelStorageHash, largestTurnNum, support, reasonString }) => {
      const channel: Channel = { chainId, participants, channelNonce };
      const channelId = getChannelId(channel);
      const { appData, whoSignedWhat } = support;
      const numStates = appData.length;

      const states: State[] = [];
      for (let i = 1; i <= numStates; i++) {
        states.push({
          isFinal: true,
          channel,
          outcome,
          appDefinition,
          appData: appData[i - 1], // Because isFinal = true...
          // ... this field is irrelevant as long as the signatures are correct
          challengeDuration,
          turnNum: largestTurnNum + i - numStates,
        });
      }
      // Call public wrapper to set state (only works on test contract)
      await (await ForceMove.setChannelStorageHash(channelId, initialChannelStorageHash)).wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(initialChannelStorageHash);

      // Sign the states
      const sigs = await signStates(states, wallets, whoSignedWhat);

      const tx = ForceMove.conclude(...concludeArgs(states, sigs, whoSignedWhat));
      if (reasonString) {
        await expect(() => tx).rejects.toThrowError(reasonString);
      } else {
        const receipt = await (await tx).wait();
        const event = receipt.events.pop();
        expect(event.args).toMatchObject({ channelId });

        // Compute expected ChannelDataHash
        const blockTimestamp = (await provider.getBlock(receipt.blockNumber)).timestamp;
        const expectedChannelStorageHash = channelDataToChannelStorageHash({
          turnNumRecord: 0,
          finalizesAt: blockTimestamp,
          outcome,
        });

        // Check channelStorageHash against the expected value
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    }
  );
});
