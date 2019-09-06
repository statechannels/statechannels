import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import AssetHolderArtifact from '../../build/contracts/TESTAssetHolder.json';
import {
  setupContracts,
  newAssetTransferredEvent,
  randomChannelId,
  allocationToParams,
} from '../test-helpers';
import {HashZero} from 'ethers/constants';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);

let AssetHolder: ethers.Contract;

// channels
const [C4, C5, C6, C7, C8, C9, X7, X8, X9] = Array(9)
  .fill(undefined)
  .map(randomChannelId);

// externals
const A = ethers.Wallet.createRandom().address.padEnd(66, '0');
const B = ethers.Wallet.createRandom().address.padEnd(66, '0');

beforeAll(async () => {
  AssetHolder = await setupContracts(provider, AssetHolderArtifact);
});

const description0 = '0. Reverts transferAll tx when outcomeHash does not match';
const reason1 = 'transferAll | submitted data does not match stored outcomeHash';
const description1 =
  '1. Pays out all holdings from directly-funded channel allocating to a single external address';
const description2 =
  '2. Pays out some of the holdings when directly-overfunded channel allocates assets to a single external address';
const description3 =
  '3. Pays out all of the holdings when directly-underfunded channel allocates assets to a single external address';
const description4 =
  '4. Transfers all holdings from directly-funded channel allocating to a single channel';
const description5 =
  '5. Transfers all holdings from directly-overfunded channel allocating to a single channel';
const description6 =
  '6. Transfers all holdings from directly-underfunded channel allocating to a single channel';
const description7 =
  '7. Transfers all holdings from directly-funded channel allocating to two external addresses (full payout, full payout)';
const description8 =
  '8. Transfers all holdings from directly-funded channel allocating to two external addresses (full payout, no payout)';
const description9 =
  '9. Transfers all holdings from directly-funded channel allocating to two external addresses (full payout, partial payout)';
const description10 =
  '10. Transfers all holdings from directly-funded channel allocating to two channels (full payout, full payout)';
const description11 =
  '11. Transfers all holdings from directly-funded channel allocating to two channels (full payout, no payout)';
const description12 =
  '12. Transfers all holdings from directly-funded channel allocating to two channels (full payout, partial payout)';

// amounts are valueString represenationa of wei
describe('transferAll', () => {
  it.each`
    description      | nonce | outcomeSet | held   | destBefore  | amountsBefore | destAfter | amountsAfter | heldAfterId | heldAfterAmounts | payouts       | heldAfter | reasonString
    ${description0}  | ${0}  | ${false}   | ${'1'} | ${[A]}      | ${['1']}      | ${[]}     | ${[]}        | ${[]}       | ${[]}            | ${[]}         | ${'0'}    | ${reason1}
    ${description1}  | ${1}  | ${true}    | ${'1'} | ${[A]}      | ${['1']}      | ${[]}     | ${[]}        | ${[]}       | ${[]}            | ${[]}         | ${'0'}    | ${undefined}
    ${description2}  | ${2}  | ${true}    | ${'2'} | ${[A]}      | ${['1']}      | ${[]}     | ${[]}        | ${[]}       | ${[]}            | ${['1']}      | ${'1'}    | ${undefined}
    ${description3}  | ${3}  | ${true}    | ${'1'} | ${[A]}      | ${['2']}      | ${[A]}    | ${['1']}     | ${[]}       | ${[]}            | ${['1']}      | ${'0'}    | ${undefined}
    ${description4}  | ${4}  | ${true}    | ${'1'} | ${[C4]}     | ${['1']}      | ${[]}     | ${[]}        | ${[C4]}     | ${['1']}         | ${[]}         | ${'0'}    | ${undefined}
    ${description5}  | ${5}  | ${true}    | ${'2'} | ${[C5]}     | ${['1']}      | ${[]}     | ${[]}        | ${[C5]}     | ${['1']}         | ${[]}         | ${'1'}    | ${undefined}
    ${description6}  | ${6}  | ${true}    | ${'1'} | ${[C6]}     | ${['2']}      | ${[C6]}   | ${['1']}     | ${[C6]}     | ${['1']}         | ${[]}         | ${'0'}    | ${undefined}
    ${description7}  | ${7}  | ${true}    | ${'2'} | ${[A, B]}   | ${['1', '1']} | ${[]}     | ${[]}        | ${[]}       | ${[]}            | ${['1', '1']} | ${'0'}    | ${undefined}
    ${description8}  | ${8}  | ${true}    | ${'1'} | ${[A, B]}   | ${['1', '1']} | ${[B]}    | ${['1']}     | ${[]}       | ${[]}            | ${['1']}      | ${'0'}    | ${undefined}
    ${description9}  | ${9}  | ${true}    | ${'3'} | ${[A, B]}   | ${['2', '2']} | ${[B]}    | ${['1']}     | ${[]}       | ${[]}            | ${['2', '1']} | ${'0'}    | ${undefined}
    ${description10} | ${10} | ${true}    | ${'2'} | ${[C7, X7]} | ${['1', '1']} | ${[]}     | ${[]}        | ${[C7, X7]} | ${['1', '1']}    | ${[]}         | ${'0'}    | ${undefined}
    ${description11} | ${11} | ${true}    | ${'1'} | ${[C8, X8]} | ${['1', '1']} | ${[X8]}   | ${['1']}     | ${[C8]}     | ${['1']}         | ${[]}         | ${'0'}    | ${undefined}
    ${description12} | ${12} | ${true}    | ${'3'} | ${[C9, X9]} | ${['2', '2']} | ${[X9]}   | ${['1']}     | ${[C9, X9]} | ${['2', '1']}    | ${[]}         | ${'0'}    | ${undefined}
  `(
    '$description',
    async ({
      nonce,
      outcomeSet,
      held,
      destBefore,
      amountsBefore,
      destAfter,
      amountsAfter,
      heldAfterId,
      heldAfterAmounts,
      payouts,
      heldAfter,
      reasonString,
    }) => {
      amountsBefore = amountsBefore.map(x => ethers.utils.parseUnits(x, 'wei'));
      amountsAfter = amountsAfter.map(x => ethers.utils.parseUnits(x, 'wei'));
      heldAfterAmounts = heldAfterAmounts.map(x => ethers.utils.parseUnits(x, 'wei'));
      held = ethers.utils.parseUnits(held, 'wei');
      heldAfter = ethers.utils.parseUnits(heldAfter, 'wei');
      if (payouts.length > 0) {
        payouts = payouts.map(x => ethers.utils.parseUnits(x, 'wei'));
      }

      // compute channelId
      const channelId = randomChannelId(nonce);

      // set holdings (only works on test contract)
      if (held > 0) {
        await (await AssetHolder.setHoldings(channelId, held)).wait();
        expect(await AssetHolder.holdings(channelId)).toEqual(held);
      }

      // also reset the holdings for any beneficiary contracts we expect to be updated
      if (heldAfterId.length > 0) {
        heldAfterId.forEach(async (x, index) => {
          await (await AssetHolder.setHoldings(x, 0)).wait();
          expect((await AssetHolder.holdings(x)).eq(0)).toBe(true);
        });
      }

      // compute an appropriate allocation
      const allocation = destBefore.map((x, index, array) => ({
        destination: x,
        amount: amountsBefore[index],
      }));
      const [allocationBytes, outcomeHash] = allocationToParams(allocation);

      // set outcomeHash
      if (outcomeSet) {
        await (await AssetHolder.setOutcomePermissionless(channelId, outcomeHash)).wait();
        expect(await AssetHolder.outcomeHashes(channelId)).toBe(outcomeHash);
      }

      // call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(() => AssetHolder.transferAll(channelId, allocationBytes), regex);
      } else {
        // register for events
        const assetTransferredEvents = destBefore.map((x, index, array) => {
          if (payouts[index] && payouts[index].gt(0)) {
            return newAssetTransferredEvent(AssetHolder, x);
          }
        });

        // submit tx
        const tx = await AssetHolder.transferAll(channelId, allocationBytes);
        // wait for tx to be mined
        await tx.wait();

        // catch events
        const resolvedAassetTransferredEvents = await Promise.all(assetTransferredEvents);
        resolvedAassetTransferredEvents.forEach(async (x, index, array) => {
          if (payouts[index] && payouts[index].gt(0)) {
            expect(x).toEqual(payouts[index]);
          }
        });

        // check new holdings
        expect(await AssetHolder.holdings(channelId)).toEqual(heldAfter);
        if (heldAfterId.length > 0) {
          heldAfterId.forEach(async (x, index, array) => {
            expect(await AssetHolder.holdings(x)).toEqual(heldAfterAmounts[index]);
          });
        }

        // check new outcomeHash
        let expectedNewOutcomeHash;
        let _;

        if (destAfter.length > 0) {
          // compute an appropriate allocation
          const allocationAfter = destAfter.map((x, index, array) => ({
            destination: x,
            amount: amountsAfter[index],
          }));

          [_, expectedNewOutcomeHash] = allocationToParams(allocationAfter);
        } else {
          expectedNewOutcomeHash = HashZero;
        }

        expect(await AssetHolder.outcomeHashes(channelId)).toEqual(expectedNewOutcomeHash);
      }
    },
  );
});
