import {expectRevert} from '@statechannels/devtools';
import {Contract, Wallet, ethers} from 'ethers';

// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {channelDataToChannelStorageHash} from '../../../src/contract/channel-storage';
import {Outcome} from '../../../src/contract/outcome';
import {hashState, State} from '../../../src/contract/state';
import {respondArgs} from '../../../src/contract/transaction-creators/force-move';
import {
  NO_ONGOING_CHALLENGE,
  RESPONSE_UNAUTHORIZED,
  WRONG_CHANNEL_STORAGE,
} from '../../../src/contract/transaction-creators/revert-reasons';
import {
  getPlaceHolderContractAddress,
  getTestProvider,
  setupContracts,
  writeGasConsumption,
} from '../../test-helpers';
import {sign} from '../../../src/signatures';
import {Uint256} from '../../../src';

const provider = getTestProvider();
let ForceMove: Contract;
const chainId = '0x1234' as Uint256;
const participants = ['', '', ''];
const wallets = new Array(3);
const challengeDuration = 0x1000;
const assetHolderAddress = Wallet.createRandom().address;
const outcome: Outcome = [{assetHolderAddress, allocationItems: []}];
let appDefinition;

// Populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}
const nonParticipant = Wallet.createRandom();

beforeAll(async () => {
  ForceMove = await setupContracts(
    provider,
    ForceMoveArtifact,
    process.env.TEST_FORCE_MOVE_ADDRESS
  );
  appDefinition = getPlaceHolderContractAddress();
});

// Scenarios are synonymous with channelNonce:

const description1 = 'It accepts a respond tx for an ongoing challenge';
const description2 = 'It reverts a respond tx if the challenge has expired';
const description3 = 'It reverts a respond tx if the channel storage does not match';
const description4 = 'It reverts a respond tx if it is not signed by the correct participant';
const description5 =
  'It reverts a respond tx if the response state is not a validTransition from the challenge state';

describe('respond', () => {
  let channelNonce = 1000;
  const future = 1e12;
  const past = 1;
  beforeEach(() => (channelNonce += 1));
  it.each`
    description     | finalizesAt | slotEmpty | isFinalAB         | turnNumRecord | appDatas  | challenger    | responder         | reasonString
    ${description1} | ${future}   | ${false}  | ${[false, false]} | ${0}          | ${[0, 0]} | ${wallets[0]} | ${wallets[1]}     | ${undefined}
    ${description1} | ${future}   | ${false}  | ${[false, false]} | ${1}          | ${[0, 0]} | ${wallets[1]} | ${wallets[2]}     | ${undefined}
    ${description1} | ${future}   | ${false}  | ${[false, false]} | ${2}          | ${[0, 0]} | ${wallets[2]} | ${wallets[0]}     | ${undefined}
    ${description1} | ${future}   | ${false}  | ${[false, false]} | ${3}          | ${[0, 0]} | ${wallets[0]} | ${wallets[1]}     | ${undefined}
    ${description1} | ${future}   | ${false}  | ${[false, false]} | ${4}          | ${[0, 0]} | ${wallets[1]} | ${wallets[2]}     | ${undefined}
    ${description1} | ${future}   | ${false}  | ${[false, false]} | ${5}          | ${[0, 1]} | ${wallets[2]} | ${wallets[0]}     | ${undefined}
    ${description1} | ${future}   | ${false}  | ${[false, false]} | ${6}          | ${[1, 2]} | ${wallets[0]} | ${wallets[1]}     | ${undefined}
    ${description2} | ${past}     | ${false}  | ${[false, false]} | ${8}          | ${[0, 1]} | ${wallets[2]} | ${wallets[0]}     | ${NO_ONGOING_CHALLENGE}
    ${description3} | ${future}   | ${true}   | ${[false, false]} | ${8}          | ${[0, 1]} | ${wallets[2]} | ${wallets[0]}     | ${WRONG_CHANNEL_STORAGE}
    ${description4} | ${future}   | ${false}  | ${[false, false]} | ${8}          | ${[0, 1]} | ${wallets[2]} | ${nonParticipant} | ${RESPONSE_UNAUTHORIZED}
    ${description5} | ${future}   | ${false}  | ${[false, false]} | ${8}          | ${[0, 0]} | ${wallets[2]} | ${wallets[0]}     | ${'CountingApp: Counter must be incremented'}
  `(
    '$description', // For the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      description,
      isFinalAB,
      turnNumRecord,
      appDatas,
      challenger,
      responder,
      finalizesAt,
      slotEmpty,
      reasonString,
    }) => {
      const channel: Channel = {chainId, channelNonce, participants};
      const channelId = getChannelId(channel);

      const challengeState: State = {
        turnNum: turnNumRecord,
        isFinal: isFinalAB[0],
        channel,
        outcome,
        appData: ethers.utils.defaultAbiCoder.encode(['uint256'], [appDatas[0]]),
        appDefinition,
        challengeDuration,
      };

      const responseState: State = {
        turnNum: turnNumRecord + 1,
        isFinal: isFinalAB[1],
        channel,
        outcome,
        appData: ethers.utils.defaultAbiCoder.encode(['uint256'], [appDatas[1]]),
        appDefinition,
        challengeDuration,
      };
      const responseStateHash = hashState(responseState);

      const challengeExistsHash = slotEmpty
        ? ethers.constants.HashZero
        : channelDataToChannelStorageHash({
            turnNumRecord,
            finalizesAt,
            state: challenger ? challengeState : undefined,
            challengerAddress: challenger.address,
            outcome,
          });

      // Call public wrapper to set state (only works on test contract)
      await (await ForceMove.setChannelStorageHash(channelId, challengeExistsHash)).wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(challengeExistsHash);

      // Sign the state
      const responseSignature = await sign(responder, responseStateHash);

      const tx = ForceMove.respond(
        ...respondArgs({challengeState, responseSignature, responseState})
      );

      if (reasonString) {
        await expectRevert(() => tx, reasonString);
      } else {
        const receipt = await (await tx).wait();
        await writeGasConsumption('./respond.gas.md', description, receipt.gasUsed);
        const event = receipt.events.pop();

        expect(event.args).toMatchObject({
          channelId,
          newTurnNumRecord: turnNumRecord + 1,
        });

        // Compute and check new expected ChannelDataHash

        const expectedChannelStorageHash = channelDataToChannelStorageHash({
          turnNumRecord: turnNumRecord + 1,
          finalizesAt: 0,
        });
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    }
  );
});
