import {expectRevert} from '@statechannels/devtools';
import {Contract, constants, BigNumber} from 'ethers';
import {Allocation, AllocationType} from '@statechannels/exit-format';

import {
  getTestProvider,
  randomChannelId,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContract,
  AssetOutcomeShortHand,
} from '../../test-helpers';
import {TESTNitroAdjudicator} from '../../../typechain/TESTNitroAdjudicator';
// eslint-disable-next-line import/order
import TESTNitroAdjudicatorArtifact from '../../../artifacts/contracts/test/TESTNitroAdjudicator.sol/TESTNitroAdjudicator.json';
import {channelDataToStatus, encodeOutcome, hashOutcome, Outcome} from '../../../src';
import {MAGIC_ADDRESS_INDICATING_ETH} from '../../../src/transactions';
import {encodeGuaranteeData} from '../../../src/contract/outcome';
const testNitroAdjudicator: TESTNitroAdjudicator & Contract = (setupContract(
  getTestProvider(),
  TESTNitroAdjudicatorArtifact,
  process.env.TEST_NITRO_ADJUDICATOR_ADDRESS
) as unknown) as TESTNitroAdjudicator & Contract;
const addresses = {
  // Channels
  t: undefined, // Target
  g: undefined, // Guarantor
  // Externals
  I: randomExternalDestination(),
  A: randomExternalDestination(),
  B: randomExternalDestination(),
};

const reason5 = 'Channel not finalized';
const reason6 = 'targetAsset != guaranteeAsset';

// 1. claim G1 (step 1 of figure 23 of nitro paper)
// 2. claim G2 (step 2 of figure 23 of nitro paper)
// 3. claim G1 (step 1 of alternative in figure 23 of nitro paper)
// 4. claim G2 (step 2 of alternative of figure 23 of nitro paper)

// Amounts are valueString representations of wei
describe('claim', () => {
  it.each`
    name                                                      | heldBefore | guaranteeDestinations | tOutcomeBefore        | indices | tOutcomeAfter         | heldAfter | payouts         | reason
    ${' 1. straight-through guarantee, 3 destinations'}       | ${{g: 5}}  | ${['I', 'A', 'B']}    | ${{I: 5, A: 5, B: 5}} | ${[0]}  | ${{I: 0, A: 5, B: 5}} | ${{g: 0}} | ${{I: 5}}       | ${undefined}
    ${' 2. swap guarantee,             2 destinations'}       | ${{g: 5}}  | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5, B: 0}}       | ${{g: 0}} | ${{B: 5}}       | ${undefined}
    ${' 3. swap guarantee,             3 destinations'}       | ${{g: 5}}  | ${['I', 'B', 'A']}    | ${{I: 5, A: 5, B: 5}} | ${[0]}  | ${{I: 0, A: 5, B: 5}} | ${{g: 0}} | ${{I: 5}}       | ${undefined}
    ${' 4. straight-through guarantee, 2 destinations'}       | ${{g: 5}}  | ${['A', 'B']}         | ${{A: 5, B: 5}}       | ${[0]}  | ${{A: 0, B: 5}}       | ${{g: 0}} | ${{A: 5}}       | ${undefined}
    ${' 5. allocation not on chain'}                          | ${{g: 5}}  | ${['B', 'A']}         | ${{}}                 | ${[0]}  | ${{A: 5}}             | ${{g: 0}} | ${{B: 5}}       | ${reason5}
    ${' 6. guarantee not on chain'}                           | ${{g: 5}}  | ${[]}                 | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5}}             | ${{g: 0}} | ${{B: 5}}       | ${reason5}
    ${' 7. swap guarantee, overfunded, 2 destinations'}       | ${{g: 12}} | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5, B: 0}}       | ${{g: 7}} | ${{B: 5}}       | ${undefined}
    ${' 8. underspecified guarantee, overfunded      '}       | ${{g: 12}} | ${['B']}              | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5, B: 0}}       | ${{g: 7}} | ${{B: 5}}       | ${undefined}
    ${' 9. (all) straight-through guarantee, 3 destinations'} | ${{g: 5}}  | ${['I', 'A', 'B']}    | ${{I: 5, A: 5, B: 5}} | ${[]}   | ${{I: 0, A: 5, B: 5}} | ${{g: 0}} | ${{I: 5}}       | ${undefined}
    ${'10. (all) swap guarantee,             2 destinations'} | ${{g: 5}}  | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${[]}   | ${{A: 5, B: 0}}       | ${{g: 0}} | ${{B: 5}}       | ${undefined}
    ${'11. (all) swap guarantee,             3 destinations'} | ${{g: 5}}  | ${['I', 'B', 'A']}    | ${{I: 5, A: 5, B: 5}} | ${[]}   | ${{I: 0, A: 5, B: 5}} | ${{g: 0}} | ${{I: 5}}       | ${undefined}
    ${'12. (all) straight-through guarantee, 2 destinations'} | ${{g: 5}}  | ${['A', 'B']}         | ${{A: 5, B: 5}}       | ${[]}   | ${{A: 0, B: 5}}       | ${{g: 0}} | ${{A: 5}}       | ${undefined}
    ${'13. (all) allocation not on chain'}                    | ${{g: 5}}  | ${['B', 'A']}         | ${{}}                 | ${[]}   | ${{}}                 | ${{g: 0}} | ${{B: 5}}       | ${reason5}
    ${'14. (all) guarantee not on chain'}                     | ${{g: 5}}  | ${[]}                 | ${{A: 5, B: 5}}       | ${[]}   | ${{A: 5, B: 5}}       | ${{g: 0}} | ${{B: 5}}       | ${reason5}
    ${'15. (all) swap guarantee, overfunded, 2 destinations'} | ${{g: 12}} | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${[]}   | ${{A: 0, B: 0}}       | ${{g: 2}} | ${{A: 5, B: 5}} | ${undefined}
    ${'16. (all) underspecified guarantee, overfunded      '} | ${{g: 12}} | ${['B']}              | ${{A: 5, B: 5}}       | ${[]}   | ${{A: 5, B: 0}}       | ${{g: 7}} | ${{A: 5, B: 5}} | ${undefined}
    ${'17. guarantee and target assets do not match'}         | ${{g: 1}}  | ${['A', 'B']}         | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 4, B: 5}}       | ${{g: 0}} | ${{A: 1}}       | ${reason6}
  `(
    '$name',
    async ({
      heldBefore,
      guaranteeDestinations,
      tOutcomeBefore,
      indices,
      tOutcomeAfter,
      heldAfter,
      payouts,
      reason,
    }: {
      heldBefore: AssetOutcomeShortHand;
      guaranteeDestinations;
      tOutcomeBefore: AssetOutcomeShortHand;
      indices: number[];
      tOutcomeAfter: AssetOutcomeShortHand;
      heldAfter: AssetOutcomeShortHand;
      payouts: AssetOutcomeShortHand;
      reason;
    }) => {
      // Compute channelIds
      const targetId = randomChannelId();
      const guarantorId = randomChannelId();
      addresses.t = targetId;
      addresses.g = guarantorId;

      // Transform input data (unpack addresses and BigNumber amounts)
      [heldBefore, tOutcomeBefore, tOutcomeAfter, heldAfter, payouts] = [
        heldBefore,
        tOutcomeBefore,
        tOutcomeAfter,
        heldAfter,
        payouts,
      ].map(object => replaceAddressesAndBigNumberify(object, addresses) as AssetOutcomeShortHand);
      guaranteeDestinations = guaranteeDestinations.map(x => addresses[x]);

      // Deposit into channels

      await Promise.all(
        Object.keys(heldBefore).map(async key => {
          // Key must be either in heldBefore or heldAfter or both
          const amount = heldBefore[key];
          await (
            await testNitroAdjudicator.deposit(MAGIC_ADDRESS_INDICATING_ETH, key, 0, amount, {
              value: amount,
            })
          ).wait();
          expect(
            (await testNitroAdjudicator.holdings(MAGIC_ADDRESS_INDICATING_ETH, key)).eq(amount)
          ).toBe(true);
        })
      );

      // Compute an appropriate allocation.
      const allocation: Allocation[] = [];
      Object.keys(tOutcomeBefore).forEach(key =>
        allocation.push({
          destination: key,
          amount: tOutcomeBefore[key].toString(),
          metadata: '0x',
          allocationType: AllocationType.simple,
        })
      );
      const outcomeHash = hashOutcome([
        {asset: MAGIC_ADDRESS_INDICATING_ETH, allocations: allocation, metadata: '0x'},
      ]);
      const targetOutcomeBytes = encodeOutcome([
        {asset: MAGIC_ADDRESS_INDICATING_ETH, allocations: allocation, metadata: '0x'},
      ]);

      // Set adjudicator status
      const stateHash = constants.HashZero; // not realistic, but OK for purpose of this test
      const finalizesAt = 42;
      const turnNumRecord = 7;

      if (reason != reason5) {
        await (
          await testNitroAdjudicator.setStatusFromChannelData(targetId, {
            turnNumRecord,
            finalizesAt,
            stateHash,
            outcomeHash,
          })
        ).wait();
      }

      // Compute an appropriate guarantee
      const encodedGuaranteeData = encodeGuaranteeData(guaranteeDestinations);
      const guaranteeOutcome: Outcome = [
        {
          metadata: '0x',
          allocations: [
            {
              allocationType: AllocationType.guarantee,
              amount: heldBefore[addresses.g].toString(),
              destination: targetId,
              metadata: encodedGuaranteeData,
            },
          ],
          asset:
            reason === reason6 // test case for mismatched source and target assets
              ? '0xdac17f958d2ee523a2206206994597c13d831ec7' // USDT
              : MAGIC_ADDRESS_INDICATING_ETH,
        },
      ];

      const guarantorOutcomeBytes = encodeOutcome(guaranteeOutcome);
      const guarantorOutcomeHash = hashOutcome(guaranteeOutcome);

      // Set status for guarantor
      if (guaranteeDestinations.length > 0) {
        await (
          await testNitroAdjudicator.setStatusFromChannelData(guarantorId, {
            turnNumRecord,
            finalizesAt,
            stateHash,
            outcomeHash: guarantorOutcomeHash,
          })
        ).wait();
      }

      const tx = testNitroAdjudicator.claim({
        sourceChannelId: guarantorId,
        sourceStateHash: stateHash,
        sourceOutcomeBytes: guarantorOutcomeBytes,
        sourceAssetIndex: 0, // TODO: introduce test cases with multiple-asset Source and Targets
        indexOfTargetInSource: 0,
        targetStateHash: stateHash,
        targetOutcomeBytes,
        targetAssetIndex: 0,
        targetAllocationIndicesToPayout: indices,
      });

      // Call method in a slightly different way if expecting a revert
      if (reason) {
        await expectRevert(() => tx, reason);
      } else {
        // Extract logs
        const {events: eventsFromTx} = await (await tx).wait();

        // Check new holdings
        const heldAfterChecks = Object.keys(heldAfter).map(async g => {
          return expect(
            await testNitroAdjudicator.holdings(MAGIC_ADDRESS_INDICATING_ETH, g)
          ).toEqual(heldAfter[g]);
        });

        await Promise.all(heldAfterChecks);

        // Check new outcomeHash
        const allocationAfter: Allocation[] = [];
        Object.keys(tOutcomeAfter).forEach(key => {
          allocationAfter.push({
            destination: key,
            amount: tOutcomeAfter[key].toString(),
            metadata: '0x',
            allocationType: AllocationType.simple,
          });
        });
        const outcomeAfter: Outcome = [
          {asset: MAGIC_ADDRESS_INDICATING_ETH, allocations: allocationAfter, metadata: '0x'},
        ];
        const expectedStatusAfter = channelDataToStatus({
          turnNumRecord,
          finalizesAt,
          // stateHash will be set to HashZero by this helper fn
          // if state property of this object is undefined
          outcome: outcomeAfter,
        });
        expect(await testNitroAdjudicator.statusOf(targetId)).toEqual(expectedStatusAfter);

        // Compile event expectations
        const expectedEvents = [
          {
            event: 'AllocationUpdated',
            args: {
              channelId: guarantorId,
              assetIndex: BigNumber.from(0),
              initialHoldings: heldBefore[addresses.g],
            },
          },
          {
            event: 'AllocationUpdated',
            args: {
              channelId: targetId,
              assetIndex: BigNumber.from(0),
              initialHoldings: heldBefore[addresses.g],
            },
          },
        ];

        // Check that each expectedEvent is contained as a subset of the properies of each *corresponding* event: i.e. the order matters!
        expect(eventsFromTx).toMatchObject(expectedEvents);
      }
    }
  );
});
