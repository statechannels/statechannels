// @ts-ignore
// @ts-ignore
import {expectRevert} from '@statechannels/devtools';
import {Contract, Wallet} from 'ethers';
import {AddressZero} from 'ethers/constants';
import {bigNumberify} from 'ethers/utils';
// @ts-ignore
import AssetHolderArtifact1 from '../../../build/contracts/TESTAssetHolder.json';
// @ts-ignore
import AssetHolderArtifact2 from '../../../build/contracts/TESTAssetHolder2.json';
// @ts-ignore
import NitroAdjudicatorArtifact from '../../../build/contracts/TESTNitroAdjudicator.json';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {Allocation, AllocationAssetOutcome, encodeOutcome} from '../../../src/contract/outcome';
import {hashState, State} from '../../../src/contract/state';
import {
  allocationToParams,
  randomChannelId,
  randomExternalDestination,
  replaceAddresses,
} from '../../test-helpers';
import {finalizedOutcomeHash, getTestProvider, setupContracts} from '../../test-helpers';

const provider = getTestProvider();
let NitroAdjudicator: Contract;
let AssetHolder1: Contract;
let AssetHolder2: Contract;

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

// constants for this test suite

const chainId = '0x1234';
const participants = ['', '', ''];
const wallets = new Array(3);

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}
beforeAll(async () => {
  NitroAdjudicator = await setupContracts(provider, NitroAdjudicatorArtifact);
  AssetHolder1 = await setupContracts(provider, AssetHolderArtifact1);
  AssetHolder2 = await setupContracts(provider, AssetHolderArtifact2);
  addresses.ETH = AssetHolder1.address;
  addresses.TOK = AssetHolder2.address;
});

// Scenarios are synonymous with channelNonce:

// const description1 =
//   'NitroAdjudicator accepts a pushOutcomeAndTransferAll tx for a finalized channel, and 1x Asset types transferred';
const description2 =
  'NitroAdjudicator accepts a pushOutcomeAndTransferAll tx for a finalized channel, and 2x Asset types transferred';
const channelNonce = '1101';
const storedTurnNumRecord = 5;
const declaredTurnNumRecord = storedTurnNumRecord;
const finalized = true;

describe('pushOutcomeAndTransferAll', () => {
  it.each`
    description     | setOutcome                    | heldBefore                    | newOutcome | heldAfter                     | payouts                       | reasonString
    ${description2} | ${{ETH: {A: 1}, TOK: {A: 2}}} | ${{ETH: {c: 1}, TOK: {c: 2}}} | ${{}}      | ${{ETH: {c: 0}, TOK: {c: 0}}} | ${{ETH: {A: 1}, TOK: {A: 2}}} | ${undefined}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({setOutcome, heldBefore, newOutcome, heldAfter, payouts, reasonString}) => {
      const channel: Channel = {chainId, channelNonce, participants};
      const channelId = getChannelId(channel);
      addresses.c = channelId;
      const finalizesAt = finalized ? 1 : 1e12; // either 1 second after unix epoch, or ~ 31000 years after

      // reset the holdings (only works on test contracts)
      Object.keys(heldBefore).forEach(assetHolder => {
        const holdings = heldBefore[assetHolder];
        Object.keys(holdings).forEach(async destination => {
          const amount = bigNumberify(holdings[destination]);
          if (assetHolder === 'ETH') {
            await (await AssetHolder1.setHoldings(addresses[destination], amount)).wait();
            expect((await AssetHolder1.holdings(addresses[destination])).eq(amount)).toBe(true);
          }
          if (assetHolder === 'TOK') {
            await (await AssetHolder2.setHoldings(addresses[destination], amount)).wait();
            expect((await AssetHolder2.holdings(addresses[destination])).eq(amount)).toBe(true);
          }
        });
      });

      // compute the outcome.

      const outcome: AllocationAssetOutcome[] = [];
      Object.keys(setOutcome).forEach(assetHolder => {
        const allocation: Allocation = [];
        Object.keys(setOutcome[assetHolder]).forEach(destination =>
          allocation.push({
            destination: addresses[destination],
            amount: setOutcome[assetHolder][destination],
          })
        );
        const assetOutcome: AllocationAssetOutcome = {
          assetHolderAddress: addresses[assetHolder],
          allocation,
        }; // TODO handle gurantee outcomes
        outcome.push(assetOutcome);
      });

      // We don't care about the actual values in the state
      const state: State = {
        turnNum: 0,
        isFinal: false,
        channel,
        outcome,
        appDefinition: AddressZero,
        appData: '0x0',
        challengeDuration: 0x1,
      };

      const challengerAddress = participants[state.turnNum % participants.length];

      const initialChannelStorageHash = finalizedOutcomeHash(
        storedTurnNumRecord,
        finalizesAt,
        outcome,
        state,
        challengerAddress
      );

      // call public wrapper to set state (only works on test contract)
      const tx0 = await NitroAdjudicator.setChannelStorageHash(
        channelId,
        initialChannelStorageHash
      );
      await tx0.wait();
      expect(await NitroAdjudicator.channelStorageHashes(channelId)).toEqual(
        initialChannelStorageHash
      );

      const stateHash = hashState(state);
      const encodedOutcome = encodeOutcome(outcome);

      const tx1 = NitroAdjudicator.pushOutcomeAndTransferAll(
        channelId,
        declaredTurnNumRecord,
        finalizesAt,
        stateHash,
        challengerAddress,
        encodedOutcome,
        {gasLimit: 300000}
      );

      // call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$'
        );
        await expectRevert(() => tx1, regex);
      } else {
        const {logs} = await (await tx1).wait();
        const AssetHolderInterface = AssetHolder1.interface;
        const events = [];
        // since the event was emitted by contract other than the 'to' of the transaction, we have to work a little harder to extract the event information:
        logs.forEach(log =>
          events.push({...AssetHolderInterface.parseLog(log), contract: log.address})
        );
        // build up event expectations
        const expectedEvents = [];
        Object.keys(payouts).forEach(assetHolder => {
          const singleAssetPayouts = replaceAddresses(payouts[assetHolder], addresses);
          Object.keys(singleAssetPayouts).forEach(destination => {
            if (singleAssetPayouts[destination] && singleAssetPayouts[destination].gt(0)) {
              expectedEvents.push({
                contract: addresses[assetHolder],
                name: 'AssetTransferred',
                values: {destination, amount: singleAssetPayouts[destination]},
              });
            }
          });
        });
        // check that each expectedEvent is contained as a subset of the properies of each *corresponding* event: i.e. the order matters!
        expect(events).toMatchObject(expectedEvents);

        // check new holdings on each AssetHolder
        Object.keys(heldAfter).forEach(assetHolder => {
          const heldAfterSingleAsset = replaceAddresses(heldAfter[assetHolder], addresses);
          Object.keys(heldAfterSingleAsset).forEach(async destination => {
            const amount = bigNumberify(heldAfterSingleAsset[destination]);
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
          const newOutcomeSingleAsset = replaceAddresses(newOutcome[assetHolder], addresses);
          const allocationAfter = [];
          Object.keys(newOutcomeSingleAsset).forEach(destination => {
            const amount = bigNumberify(newOutcomeSingleAsset[destination]);
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

// TODO also check for updates to the asset holders' holdings storage mapping
