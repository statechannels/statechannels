import {expectRevert} from '@statechannels/devtools';
import {Contract, constants} from 'ethers';

import {
  getRandomNonce,
  getTestProvider,
  randomChannelId,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContract,
  MAGIC_ADDRESS_INDICATING_ETH,
  AssetOutcomeShortHand,
} from '../../test-helpers';
import {TESTMultiAssetHolder} from '../../../typechain/TESTMultiAssetHolder';
// eslint-disable-next-line import/order
import TESTMultiAssetHolderArtifact from '../../../artifacts/contracts/test/TESTMultiAssetHolder.sol/TESTMultiAssetHolder.json';
import {channelDataToStatus, encodeOutcome, hashOutcome, Outcome} from '../../../src';
const testMultiAssetHolder: TESTMultiAssetHolder & Contract = (setupContract(
  getTestProvider(),
  TESTMultiAssetHolderArtifact,
  process.env.TEST_MULTI_ASSET_HOLDER_ADDRESS
) as unknown) as TESTMultiAssetHolder & Contract;
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

// 1. claim G1 (step 1 of figure 23 of nitro paper)
// 2. claim G2 (step 2 of figure 23 of nitro paper)
// 3. claim G1 (step 1 of alternative in figure 23 of nitro paper)
// 4. claim G2 (step 2 of alternative of figure 23 of nitro paper)

// Amounts are valueString representations of wei
describe('claim', () => {
  it.each`
    name                                               | heldBefore | guaranteeDestinations | tOutcomeBefore        | indices | tOutcomeAfter         | heldAfter | payouts   | reason
    ${'1. straight-through guarantee, 3 destinations'} | ${{g: 5}}  | ${['I', 'A', 'B']}    | ${{I: 5, A: 5, B: 5}} | ${[0]}  | ${{I: 0, A: 5, B: 5}} | ${{g: 0}} | ${{I: 5}} | ${undefined}
    ${'2. swap guarantee,             2 destinations'} | ${{g: 5}}  | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5, B: 0}}       | ${{g: 0}} | ${{B: 5}} | ${undefined}
    ${'3. swap guarantee,             3 destinations'} | ${{g: 5}}  | ${['I', 'B', 'A']}    | ${{I: 5, A: 5, B: 5}} | ${[0]}  | ${{I: 0, A: 5, B: 5}} | ${{g: 0}} | ${{I: 5}} | ${undefined}
    ${'4. straight-through guarantee, 2 destinations'} | ${{g: 5}}  | ${['A', 'B']}         | ${{A: 5, B: 5}}       | ${[0]}  | ${{A: 0, B: 5}}       | ${{g: 0}} | ${{A: 5}} | ${undefined}
    ${'5. allocation not on chain'}                    | ${{g: 5}}  | ${['B', 'A']}         | ${{}}                 | ${[0]}  | ${{A: 5}}             | ${{g: 0}} | ${{B: 5}} | ${reason5}
    ${'6. guarantee not on chain'}                     | ${{g: 5}}  | ${[]}                 | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5}}             | ${{g: 0}} | ${{B: 5}} | ${reason5}
    ${'7. swap guarantee, overfunded, 2 destinations'} | ${{g: 12}} | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5, B: 0}}       | ${{g: 7}} | ${{B: 5}} | ${undefined}
    ${'8. underspecified guarantee, overfunded      '} | ${{g: 12}} | ${['B']}              | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5, B: 0}}       | ${{g: 7}} | ${{B: 5}} | ${undefined}
  `(
    '$name',
    async ({
      name,
      heldBefore,
      guaranteeDestinations,
      tOutcomeBefore,
      indices,
      tOutcomeAfter,
      heldAfter,
      payouts,
      reason,
    }: {
      name;
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
      const tNonce = getRandomNonce(name);
      const gNonce = getRandomNonce(name + 'g');
      const targetId = randomChannelId(tNonce);
      const guarantorId = randomChannelId(gNonce);
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
            await testMultiAssetHolder.deposit(MAGIC_ADDRESS_INDICATING_ETH, key, 0, amount, {
              value: amount,
            })
          ).wait();
          expect(
            (await testMultiAssetHolder.holdings(MAGIC_ADDRESS_INDICATING_ETH, key)).eq(amount)
          ).toBe(true);
        })
      );

      // Compute an appropriate allocation.
      const allocation = [];
      Object.keys(tOutcomeBefore).forEach(key =>
        allocation.push({destination: key, amount: tOutcomeBefore[key]})
      );
      const outcomeHash = hashOutcome([
        {assetHolderAddress: MAGIC_ADDRESS_INDICATING_ETH, allocationItems: allocation},
      ]);
      const targetOutcomeBytes = encodeOutcome([
        {assetHolderAddress: MAGIC_ADDRESS_INDICATING_ETH, allocationItems: allocation},
      ]);

      // Set adjudicator status
      const stateHash = constants.HashZero; // not realistic, but OK for purpose of this test
      const challengerAddress = constants.AddressZero; // not realistic, but OK for purpose of this test
      const finalizesAt = 42;
      const turnNumRecord = 7;

      if (reason != reason5) {
        await (
          await testMultiAssetHolder.setStatusFromChannelData(targetId, {
            turnNumRecord,
            finalizesAt,
            stateHash,
            challengerAddress,
            outcomeHash,
          })
        ).wait();
      }

      // Compute an appropriate guarantee

      const guarantee = {
        destinations: guaranteeDestinations,
        targetChannelId: targetId,
      };

      const guaranteeOutcome: Outcome = [
        {assetHolderAddress: MAGIC_ADDRESS_INDICATING_ETH, guarantee},
      ];
      const guarantorOutcomeBytes = encodeOutcome(guaranteeOutcome);
      const guarantorOutcomeHash = hashOutcome(guaranteeOutcome);

      // Set status for guarantor
      if (guaranteeDestinations.length > 0) {
        await (
          await testMultiAssetHolder.setStatusFromChannelData(guarantorId, {
            turnNumRecord,
            finalizesAt,
            stateHash,
            challengerAddress,
            outcomeHash: guarantorOutcomeHash,
          })
        ).wait();
      }

      const tx = testMultiAssetHolder.claim(
        0,
        guarantorId,
        guarantorOutcomeBytes,
        stateHash,
        challengerAddress,
        targetOutcomeBytes,
        stateHash,
        challengerAddress,
        indices
      );

      // Call method in a slightly different way if expecting a revert
      if (reason) {
        await expectRevert(() => tx, reason);
      } else {
        // Extract logs
        const {events: eventsFromTx} = await (await tx).wait();

        // Check new holdings
        Object.keys(heldAfter).forEach(async key =>
          expect(await testMultiAssetHolder.holdings(MAGIC_ADDRESS_INDICATING_ETH, key)).toEqual(
            heldAfter[key]
          )
        );

        // Check new outcomeHash
        const allocationAfter = [];
        Object.keys(tOutcomeAfter).forEach(key => {
          allocationAfter.push({destination: key, amount: tOutcomeAfter[key]});
        });
        const outcomeAfter: Outcome = [
          {assetHolderAddress: MAGIC_ADDRESS_INDICATING_ETH, allocationItems: allocationAfter},
        ];
        const expectedStatusAfter = channelDataToStatus({
          turnNumRecord,
          finalizesAt,
          // stateHash will be set to HashZero by this helper fn
          // if state property of this object is undefined
          challengerAddress,
          outcome: outcomeAfter,
        });
        expect(await testMultiAssetHolder.statusOf(targetId)).toEqual(expectedStatusAfter);

        // Compile event expectations
        const expectedEvents = [
          {
            event: 'FingerprintUpdated',
            args: {
              channelId: targetId,
              outcomeBytes: encodeOutcome(outcomeAfter),
            },
          },
        ];

        // Check that each expectedEvent is contained as a subset of the properies of each *corresponding* event: i.e. the order matters!
        expect(eventsFromTx).toMatchObject(expectedEvents);
      }
    }
  );
});
