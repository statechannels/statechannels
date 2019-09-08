import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import AssetHolderArtifact from '../../build/contracts/TESTAssetHolder.json';
import {
  setupContracts,
  newAssetTransferredEvent,
  randomChannelId,
  allocationToParams,
  guaranteeToParams,
} from '../test-helpers';
import {HashZero, AddressZero} from 'ethers/constants';
import {BigNumber} from 'ethers/utils';
import {Allocation} from '../../src/outcome.js';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);

const I = ethers.Wallet.createRandom().address.padEnd(66, '0');
const A = ethers.Wallet.createRandom().address.padEnd(66, '0');
const B = ethers.Wallet.createRandom().address.padEnd(66, '0');
let AssetHolder: ethers.Contract;
let assetTransferredEvents;

beforeAll(async () => {
  AssetHolder = await setupContracts(provider, AssetHolderArtifact);
});

const description0 =
  'Pays out and updates holdings, outcomeHashes correctly (straight-through guarantee, 3 destinations)'; // claim G1 (step 1 of figure 23 of nitro paper)
const description1 =
  'Pays out and updates holdings, outcomeHashes correctly (swap guarantee, 2 destinations)'; // claim G2 (step 2 of figure 23 of nitro paper)
const description2 =
  'Pays out and updates holdings, outcomeHashes out correctly (swap guarantee, 3 destinations)'; // claim G1 (step 1 of alternative in figure 23 of nitro paper)
const description3 =
  'Pays out and updates holdings, outcomeHashes correctly (straight-through guarantee, 2 destinations)'; // claim G2 (step 2 of alternative of figure 23 of nitro paper)
const description4 = 'Reverts when allocation not on chain';
const description5 = 'Reverts when guarantee not on chain';

// amounts are valueString representations of wei
describe('claimAll', () => {
  it.each`
    description     | cNonce | cDestBefore  | cAmountsBefore     | cDestAfter | cAmountsAfter | gNonce | guaranteeDestinations | gHeldBefore | gHeldAfter | outcomeSet       | payouts            | reasonString
    ${description0} | ${0}   | ${[I, A, B]} | ${['5', '5', '5']} | ${[A, B]}  | ${['5', '5']} | ${100} | ${[I, A, B]}          | ${'5'}      | ${'0'}     | ${[true, true]}  | ${['5', '0', '0']} | ${undefined}
    ${description1} | ${1}   | ${[A, B]}    | ${['5', '5']}      | ${[A]}     | ${['5']}      | ${101} | ${[I, B, A]}          | ${'5'}      | ${'0'}     | ${[true, true]}  | ${['0', '5']}      | ${undefined}
    ${description2} | ${0}   | ${[I, A, B]} | ${['5', '5', '5']} | ${[A, B]}  | ${['5', '5']} | ${100} | ${[I, B, A]}          | ${'5'}      | ${'0'}     | ${[true, true]}  | ${['5', '0', '0']} | ${undefined}
    ${description3} | ${3}   | ${[A, B]}    | ${['5', '5']}      | ${[B]}     | ${['5']}      | ${103} | ${[I, A, B]}          | ${'5'}      | ${'0'}     | ${[true, true]}  | ${['5', '0']}      | ${undefined}
    ${description4} | ${3}   | ${[A, B]}    | ${['5', '5']}      | ${[B]}     | ${['5']}      | ${103} | ${[I, A, B]}          | ${'5'}      | ${'0'}     | ${[false, true]} | ${['5', '0']}      | ${'claimAll | submitted data does not match outcomeHash stored against guaranteedChannelId'}
    ${description5} | ${3}   | ${[A, B]}    | ${['5', '5']}      | ${[B]}     | ${['5']}      | ${103} | ${[I, A, B]}          | ${'5'}      | ${'0'}     | ${[true, false]} | ${['5', '0']}      | ${'claimAll | submitted data does not match outcomeHash stored against channelId'}
  `(
    '$description',
    async ({
      cNonce,
      cDestBefore,
      cAmountsBefore,
      cDestAfter,
      cAmountsAfter,
      gNonce,
      guaranteeDestinations,
      gHeldBefore,
      gHeldAfter,
      outcomeSet,
      payouts,
      reasonString,
    }) => {
      cAmountsBefore = cAmountsBefore.map(x => ethers.utils.parseUnits(x, 'wei'));
      gHeldBefore = ethers.utils.parseUnits(gHeldBefore, 'wei');
      gHeldAfter = ethers.utils.parseUnits(gHeldAfter, 'wei');
      payouts = payouts.map(x => ethers.utils.parseUnits(x, 'wei')) as BigNumber[];

      // compute channelIds
      const targetId = randomChannelId(cNonce);
      const guarantorId = randomChannelId(gNonce);

      // set holdings (only works on test contract)
      if (gHeldBefore.gt(0)) {
        await (await AssetHolder.setHoldings(guarantorId, gHeldBefore)).wait();
        expect(await AssetHolder.holdings(guarantorId)).toEqual(gHeldBefore);
      }

      const allocation: Allocation = cDestBefore.map((x, index, array) => ({
        destination: x,
        amount: cAmountsBefore[index],
      }));

      const [allocationBytes, outcomeHash] = allocationToParams(allocation);

      // set outcomeHash
      if (outcomeSet[0]) {
        await (await AssetHolder.setOutcomePermissionless(targetId, outcomeHash)).wait();
        expect(await AssetHolder.outcomeHashes(targetId)).toBe(outcomeHash);
      }

      const guarantee = {
        destinations: guaranteeDestinations,
        guaranteedChannelAddress: targetId,
      };

      const [guaranteeBytes, gOutcomeContentHash] = guaranteeToParams(guarantee);

      if (outcomeSet[1]) {
        await (await AssetHolder.setOutcomePermissionless(guarantorId, gOutcomeContentHash)).wait();
        expect(await AssetHolder.outcomeHashes(guarantorId)).toBe(gOutcomeContentHash);
      }

      // call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () => AssetHolder.claimAll(guarantorId, guaranteeBytes, allocationBytes),
          regex,
        );
      } else {
        // register for events
        assetTransferredEvents = cDestBefore.map((x, index, array) => {
          if (payouts[index].gt(0)) {
            return newAssetTransferredEvent(AssetHolder, x);
          }
        });

        // submit tx
        const tx = await AssetHolder.claimAll(guarantorId, guaranteeBytes, allocationBytes);
        // wait for tx to be mined
        await tx.wait();

        // catch events
        const resolvedAassetTransferredEvents = await Promise.all(assetTransferredEvents);
        resolvedAassetTransferredEvents.forEach(async (x, index, array) => {
          if (payouts[index].gt(0)) {
            expect(x).toEqual(payouts[index]);
          }
        });

        // assume all beneficiaries are external so no holdings to update other than
        expect(await AssetHolder.holdings(guarantorId)).toEqual(gHeldAfter);

        // check new outcomeHash
        let expectedNewOutcomeHash;
        let _;

        if (cDestAfter.length > 0) {
          // compute an appropriate allocation
          const allocationAfter: Allocation = cDestAfter.map((x, index, array) => ({
            destination: x,
            amount: cAmountsAfter[index],
          }));

          [_, expectedNewOutcomeHash] = allocationToParams(allocationAfter);
        } else {
          expectedNewOutcomeHash = HashZero;
        }

        expect(await AssetHolder.outcomeHashes(targetId)).toEqual(expectedNewOutcomeHash);
      }
    },
  );
});
