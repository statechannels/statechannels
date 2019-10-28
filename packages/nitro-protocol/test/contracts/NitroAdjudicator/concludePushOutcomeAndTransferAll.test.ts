import {expectRevert} from '@statechannels/devtools';
import {Contract, Wallet} from 'ethers';
import {HashZero} from 'ethers/constants';
import {hexlify} from 'ethers/utils';
// @ts-ignore
import countingAppArtifact from '../../../build/contracts/CountingApp.json';
// @ts-ignore
import AssetHolderArtifact1 from '../../../build/contracts/TESTAssetHolder.json';
// @ts-ignore
import AssetHolderArtifact2 from '../../../build/contracts/TESTAssetHolder2.json';
// @ts-ignore
import NitroAdjudicatorArtifact from '../../../build/contracts/TESTNitroAdjudicator.json';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {hashChannelStorage} from '../../../src/contract/channel-storage';
import {AllocationAssetOutcome} from '../../../src/contract/outcome';
import {State} from '../../../src/contract/state';
import {concludePushOutcomeAndTransferAllArgs} from '../../../src/contract/transaction-creators/force-move';
import {CHANNEL_FINALIZED} from '../../../src/contract/transaction-creators/revert-reasons';
import {
  allocationToParams,
  finalizedOutcomeHash,
  getNetworkMap,
  getTestProvider,
  randomChannelId,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContracts,
  signStates,
  resetMultipleHoldings,
  computeOutcome,
  assetTransferredEventsFromPayouts,
} from '../../test-helpers';

const provider = getTestProvider();
let NitroAdjudicator: Contract;
let AssetHolder1: Contract;
let AssetHolder2: Contract;
let networkMap;
let networkId;
const chainId = '0x1234';
const participants = ['', '', ''];
const wallets = new Array(3);
const challengeDuration = 0x1000;

let appDefinition;

const addresses = {
  // channels
  c: undefined,
  C: randomChannelId(),
  X: randomChannelId(),
  // externals
  A: randomExternalDestination(),
  B: randomExternalDestination(),
  ETH: undefined,
  TOK: undefined,
};

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}
beforeAll(async () => {
  networkMap = await getNetworkMap();
  NitroAdjudicator = await setupContracts(provider, NitroAdjudicatorArtifact);
  AssetHolder1 = await setupContracts(provider, AssetHolderArtifact1);
  AssetHolder2 = await setupContracts(provider, AssetHolderArtifact2);
  addresses.ETH = AssetHolder1.address;
  addresses.TOK = AssetHolder2.address;
  networkId = (await provider.getNetwork()).chainId;
  appDefinition = networkMap[networkId][countingAppArtifact.contractName]; // use a fixed appDefinition in all tests
});

const acceptsWhenOpenIf = 'It accepts when the channel is open, if ';
const accepts1 =
  acceptsWhenOpenIf +
  'passed n states, and the slot is empty;' +
  ' it then pays out and updates holdings as expected';

const reverts1 = 'It reverts when the outcome is already finalized';

const threeStates = {
  whoSignedWhat: [0, 1, 2],
  appData: [0, 1, 2],
};
const oneState = {
  whoSignedWhat: [0, 0, 0],
  appData: [0],
};
const turnNumRecord = 5;
const finalized = finalizedOutcomeHash(turnNumRecord);
const nParticipants = participants.length;
let channelNonce = 400;
describe('concludePushOutcomeAndTransferAll', () => {
  beforeEach(() => (channelNonce += 1));
  it.each`
    description | outcomeShortHand              | initialChannelStorageHash | largestTurnNum                   | support        | heldBefore                    | heldAfter                     | newOutcome | payouts                       | reasonString
    ${accepts1} | ${{ETH: {A: 1}, TOK: {A: 2}}} | ${HashZero}               | ${turnNumRecord - nParticipants} | ${threeStates} | ${{ETH: {c: 1}, TOK: {c: 2}}} | ${{ETH: {c: 0}, TOK: {c: 0}}} | ${{}}      | ${{ETH: {A: 1}, TOK: {A: 2}}} | ${undefined}
    ${reverts1} | ${{ETH: {A: 1}, TOK: {A: 2}}} | ${finalized}              | ${turnNumRecord + 1}             | ${oneState}    | ${{ETH: {c: 1}, TOK: {c: 2}}} | ${{ETH: {c: 0}, TOK: {c: 0}}} | ${{}}      | ${{ETH: {A: 1}, TOK: {A: 2}}} | ${CHANNEL_FINALIZED}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      outcomeShortHand,
      initialChannelStorageHash,
      largestTurnNum,
      support,
      heldBefore,
      heldAfter,
      newOutcome,
      payouts,
      reasonString,
    }) => {
      const channel: Channel = {chainId, participants, channelNonce: hexlify(channelNonce)};
      const channelId = getChannelId(channel);
      addresses.c = channelId;
      const {appData, whoSignedWhat} = support;
      const numStates = appData.length;

      // transform input data (unpack addresses and BigNumberify amounts)
      [heldBefore, outcomeShortHand, newOutcome, heldAfter, payouts] = [
        heldBefore,
        outcomeShortHand,
        newOutcome,
        heldAfter,
        payouts,
      ].map(object => replaceAddressesAndBigNumberify(object, addresses));

      // set holdings on multiple asset holders
      resetMultipleHoldings(heldBefore, [AssetHolder1, AssetHolder2]);

      // compute the outcome.
      const outcome: AllocationAssetOutcome[] = computeOutcome(outcomeShortHand);

      // construct states
      const states: State[] = [];
      for (let i = 1; i <= numStates; i++) {
        states.push({
          isFinal: true,
          channel,
          outcome,
          appDefinition,
          appData,
          challengeDuration,
          turnNum: largestTurnNum + i - numStates,
        });
      }

      // call public wrapper to set state (only works on test contract)
      await (await NitroAdjudicator.setChannelStorageHash(
        channelId,
        initialChannelStorageHash
      )).wait();
      expect(await NitroAdjudicator.channelStorageHashes(channelId)).toEqual(
        initialChannelStorageHash
      );

      // sign the states
      const sigs = await signStates(states, wallets, whoSignedWhat);

      // form transaction
      const tx = NitroAdjudicator.concludePushOutcomeAndTransferAll(
        ...concludePushOutcomeAndTransferAllArgs(states, sigs, whoSignedWhat)
      );

      // switch on overall test expectation
      if (reasonString) {
        await expectRevert(() => tx, reasonString);
      } else {
        const receipt = await (await tx).wait();

        // compute expected ChannelStorageHash
        const blockTimestamp = (await provider.getBlock(receipt.blockNumber)).timestamp;
        const expectedChannelStorageHash = hashChannelStorage({
          turnNumRecord: 0,
          finalizesAt: blockTimestamp,
          outcome,
        });

        // check channelStorageHash against the expected value
        expect(await NitroAdjudicator.channelStorageHashes(channelId)).toEqual(
          expectedChannelStorageHash
        );

        // extract logs
        const {logs} = await (await tx).wait();

        // TODO replace with compileEventsFromLogs(logs, [AssetHolder1, AssetHolder2, NitroAdjudicator])
        // compile events from logs
        const events = [];

        let Interface;
        logs.forEach(log => {
          switch (log.address) {
            case AssetHolder1.address:
              Interface = AssetHolder1.interface;
              break;
            case AssetHolder2.address:
              Interface = AssetHolder2.interface;
              break;
            case NitroAdjudicator.address:
              Interface = NitroAdjudicator.interface;
              break;
          }
          events.push({...Interface.parseLog(log), contract: log.address});
        });

        // compile event expectations
        let expectedEvents = [];

        // add Conclude event to expectations
        expectedEvents.push({
          contract: NitroAdjudicator.address,
          name: 'Concluded',
          values: {channelId},
        });

        // add AssetTransferred events to expectations
        Object.keys(payouts).forEach(assetHolder => {
          expectedEvents = expectedEvents.concat(
            assetTransferredEventsFromPayouts(payouts[assetHolder], assetHolder)
          );
        });

        // check that each expectedEvent is contained as a subset of the properies of each *corresponding* event: i.e. the order matters!
        expect(events).toMatchObject(expectedEvents);

        // check new holdings on each AssetHolder
        Object.keys(heldAfter).forEach(assetHolder => {
          const heldAfterSingleAsset = heldAfter[assetHolder];
          Object.keys(heldAfterSingleAsset).forEach(async destination => {
            const amount = heldAfterSingleAsset[destination];
            if (assetHolder === 'ETH') {
              expect(await AssetHolder1.holdings(destination)).toEqual(amount);
            }
            if (assetHolder === 'TOK') {
              expect(await AssetHolder2.holdings(destination)).toEqual(amount);
            }
          });
        });

        // check new assetOutcomeHash on each AssetHolder
        Object.keys(newOutcome).forEach(async assetHolder => {
          const newOutcomeSingleAsset = newOutcome[assetHolder];
          const allocationAfter = [];
          Object.keys(newOutcomeSingleAsset).forEach(destination => {
            const amount = newOutcomeSingleAsset[destination];
            allocationAfter.push({destination, amount});
          });
          const [, expectedNewOutcomeHash] = allocationToParams(allocationAfter);
          if (assetHolder === 'ETH') {
            expect(await AssetHolder1.assetOutcomeHashes(channelId)).toEqual(
              expectedNewOutcomeHash
            );
          }
          if (assetHolder === 'TOK') {
            expect(await AssetHolder2.assetOutcomeHashes(channelId)).toEqual(
              expectedNewOutcomeHash
            );
          }
        });
      }
    }
  );
});
