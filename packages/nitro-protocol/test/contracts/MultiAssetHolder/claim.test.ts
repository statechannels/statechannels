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
import {
  channelDataToStatus,
  convertBytes32ToAddress,
  encodeOutcome,
  hashOutcome,
  Outcome,
} from '../../../src';
import {MAGIC_ADDRESS_INDICATING_ETH} from '../../../src/transactions';
import {encodeGuaranteeData} from '../../../src/contract/outcome';
const provider = getTestProvider();
const testNitroAdjudicator: TESTNitroAdjudicator & Contract = (setupContract(
  provider,
  TESTNitroAdjudicatorArtifact,
  process.env.TEST_NITRO_ADJUDICATOR_ADDRESS
) as unknown) as TESTNitroAdjudicator & Contract;
const addresses = {
  // Channels
  t: undefined, // Target
  g: undefined, // Guarantor
  x: undefined, // Application
  // Externals
  I: randomExternalDestination(),
  A: randomExternalDestination(),
  B: randomExternalDestination(),
};

const reason5 = 'Channel not finalized';
const reason6 = 'targetAsset != guaranteeAsset';

const names = {
  1: ' 1. straight-through guarantee, 3 destinations', // 1. claim G1 (step 1 of figure 23 of nitro paper)
  2: ' 2. swap guarantee,             2 destinations', // 2. claim G2 (step 2 of figure 23 of nitro paper)
  3: ' 3. swap guarantee,             3 destinations', // 3. claim G1 (step 1 of alternative in figure 23 of nitro paper)
  4: ' 4. straight-through guarantee, 2 destinations', // 4. claim G2 (step 2 of alternative of figure 23 of nitro paper)
  5: ' 5. allocation not on chain',
  6: ' 6. guarantee not on chain',
  7: ' 7. swap guarantee, overfunded, 2 destinations',
  8: ' 8. underspecified guarantee, overfunded      ',
  9: ' 9. (all) straight-through guarantee, 3 destinations',
  10: '10. (all) swap guarantee,             2 destinations',
  11: '11. (all) swap guarantee,             3 destinations',
  12: '12. (all) straight-through guarantee, 2 destinations',
  13: '13. (all) allocation not on chain',
  14: '14. (all) guarantee not on chain',
  15: '15. (all) swap guarantee, overfunded, 2 destinations',
  16: '16. (all) underspecified guarantee, overfunded      ',
  17: '17. guarantee and target assets do not match',
  18: '18. guarantee includes destination missing in target outcome, indices=[], lowest priority is a channel',
  19: '19. guarantee includes destination missing in target outcome, indices=[1], lowest priority is a channel',
  20: '20. guarantee includes destination missing in target outcome, indices=[], lowest priority is an external destination', // this guarantee is typical of the virtual funding construction
  21: '21. guarantee includes destination missing in target outcome, indices=[1], lowest priority is an external destination', // this guarantee is typical of the virtual funding construction
};

// Amounts are valueString representations of wei
describe('claim', () => {
  it.each`
    name         | heldBefore | guaranteeDestinations | tOutcomeBefore        | indices | tOutcomeAfter         | heldAfter        | payouts         | reason
    ${names[1]}  | ${{g: 5}}  | ${['I', 'A', 'B']}    | ${{I: 5, A: 5, B: 5}} | ${[0]}  | ${{I: 0, A: 5, B: 5}} | ${{g: 0}}        | ${{I: 5}}       | ${undefined}
    ${names[2]}  | ${{g: 5}}  | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5, B: 0}}       | ${{g: 0}}        | ${{B: 5}}       | ${undefined}
    ${names[3]}  | ${{g: 5}}  | ${['I', 'B', 'A']}    | ${{I: 5, A: 5, B: 5}} | ${[0]}  | ${{I: 0, A: 5, B: 5}} | ${{g: 0}}        | ${{I: 5}}       | ${undefined}
    ${names[4]}  | ${{g: 5}}  | ${['A', 'B']}         | ${{A: 5, B: 5}}       | ${[0]}  | ${{A: 0, B: 5}}       | ${{g: 0}}        | ${{A: 5}}       | ${undefined}
    ${names[5]}  | ${{g: 5}}  | ${['B', 'A']}         | ${{}}                 | ${[0]}  | ${{A: 5}}             | ${{g: 0}}        | ${{B: 5}}       | ${reason5}
    ${names[6]}  | ${{g: 5}}  | ${[]}                 | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5}}             | ${{g: 0}}        | ${{B: 5}}       | ${reason5}
    ${names[7]}  | ${{g: 12}} | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5, B: 0}}       | ${{g: 7}}        | ${{B: 5}}       | ${undefined}
    ${names[8]}  | ${{g: 12}} | ${['B']}              | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5, B: 0}}       | ${{g: 7}}        | ${{B: 5}}       | ${undefined}
    ${names[9]}  | ${{g: 5}}  | ${['I', 'A', 'B']}    | ${{I: 5, A: 5, B: 5}} | ${[]}   | ${{I: 0, A: 5, B: 5}} | ${{g: 0}}        | ${{I: 5}}       | ${undefined}
    ${names[10]} | ${{g: 5}}  | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${[]}   | ${{A: 5, B: 0}}       | ${{g: 0}}        | ${{B: 5}}       | ${undefined}
    ${names[11]} | ${{g: 5}}  | ${['I', 'B', 'A']}    | ${{I: 5, A: 5, B: 5}} | ${[]}   | ${{I: 0, A: 5, B: 5}} | ${{g: 0}}        | ${{I: 5}}       | ${undefined}
    ${names[12]} | ${{g: 5}}  | ${['A', 'B']}         | ${{A: 5, B: 5}}       | ${[]}   | ${{A: 0, B: 5}}       | ${{g: 0}}        | ${{A: 5}}       | ${undefined}
    ${names[13]} | ${{g: 5}}  | ${['B', 'A']}         | ${{}}                 | ${[]}   | ${{}}                 | ${{g: 0}}        | ${{B: 5}}       | ${reason5}
    ${names[14]} | ${{g: 5}}  | ${[]}                 | ${{A: 5, B: 5}}       | ${[]}   | ${{A: 5, B: 5}}       | ${{g: 0}}        | ${{B: 5}}       | ${reason5}
    ${names[15]} | ${{g: 12}} | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${[]}   | ${{A: 0, B: 0}}       | ${{g: 2}}        | ${{A: 5, B: 5}} | ${undefined}
    ${names[16]} | ${{g: 12}} | ${['B']}              | ${{A: 5, B: 5}}       | ${[]}   | ${{A: 5, B: 0}}       | ${{g: 7}}        | ${{B: 5}}       | ${undefined}
    ${names[17]} | ${{g: 1}}  | ${['A', 'B']}         | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 4, B: 5}}       | ${{g: 0}}        | ${{A: 1}}       | ${reason6}
    ${names[18]} | ${{g: 10}} | ${['A', 'I', 'x']}    | ${{x: 10, I: 10}}     | ${[]}   | ${{x: 10, I: 0}}      | ${{g: 0}}        | ${{I: 10}}      | ${undefined}
    ${names[19]} | ${{g: 10}} | ${['A', 'I', 'x']}    | ${{x: 10, I: 10}}     | ${[1]}  | ${{x: 10, I: 0}}      | ${{g: 0}}        | ${{I: 10}}      | ${undefined}
    ${names[20]} | ${{g: 10}} | ${['A', 'x', 'I']}    | ${{x: 10, I: 10}}     | ${[]}   | ${{x: 0, I: 10}}      | ${{g: 0, x: 10}} | ${{}}           | ${undefined}
    ${names[21]} | ${{g: 10}} | ${['A', 'x', 'I']}    | ${{x: 10, I: 10}}     | ${[0]}  | ${{x: 0, I: 10}}      | ${{g: 0, x: 10}} | ${{}}           | ${undefined}
  `(
    '$name',
    async ({
      heldBefore,
      guaranteeDestinations,
      tOutcomeBefore,
      indices: targetAllocationIndicesToPayout,
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
      const sourceChannelId = randomChannelId();
      const applicationChannelId = randomChannelId();
      addresses.t = targetId;
      addresses.g = sourceChannelId;
      addresses.x = applicationChannelId;

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
      const allocations: Allocation[] = [];
      Object.keys(tOutcomeBefore).forEach(key =>
        allocations.push({
          destination: key,
          amount: tOutcomeBefore[key].toString(),
          metadata: '0x',
          allocationType: AllocationType.simple,
        })
      );
      const outcome: Outcome = [{asset: MAGIC_ADDRESS_INDICATING_ETH, allocations, metadata: '0x'}];
      const outcomeHash = hashOutcome(outcome);
      const targetOutcomeBytes = encodeOutcome(outcome);

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

      const sourceOutcomeBytes = encodeOutcome(guaranteeOutcome);
      const guarantorOutcomeHash = hashOutcome(guaranteeOutcome);

      // Set status for guarantor
      if (guaranteeDestinations.length > 0) {
        await (
          await testNitroAdjudicator.setStatusFromChannelData(sourceChannelId, {
            turnNumRecord,
            finalizesAt,
            stateHash,
            outcomeHash: guarantorOutcomeHash,
          })
        ).wait();
      }

      // record eth balances before the transaction so we can check payouts later
      const ethBalancesBefore = {};
      await Promise.all(
        Object.keys(payouts).map(async destination => {
          const address = convertBytes32ToAddress(destination);
          ethBalancesBefore[address] = await provider.getBalance(address);
        })
      );

      const tx = testNitroAdjudicator.claim({
        sourceChannelId,
        sourceStateHash: stateHash,
        sourceOutcomeBytes,
        sourceAssetIndex: 0, // TODO: introduce test cases with multiple-asset Source and Targets
        indexOfTargetInSource: 0,
        targetStateHash: stateHash,
        targetOutcomeBytes,
        targetAssetIndex: 0,
        targetAllocationIndicesToPayout,
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
              channelId: sourceChannelId,
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

        // check payouts
        await Promise.all(
          Object.keys(payouts).map(async destination => {
            const address = convertBytes32ToAddress(destination);
            const balanceAfter = await provider.getBalance(address);
            const expectedBalanceAfter = ethBalancesBefore[address].add(payouts[destination]);
            expect(balanceAfter).toEqual(expectedBalanceAfter);
          })
        );
      }
    }
  );
});
