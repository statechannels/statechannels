import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import AssetHolderArtifact from '../../../build/contracts/TESTAssetHolder.json';
import {
  setupContracts,
  newAssetTransferredEvent,
  randomChannelId,
  allocationToParams,
  guaranteeToParams,
  sendTransaction,
  replaceAddresses,
} from '../../test-helpers';
import {createClaimAllTransaction} from '../../../src/contract/transaction-creators/asset-holder';
import {id, bigNumberify} from 'ethers/utils';

const AssetHolderInterface = new ethers.utils.Interface(AssetHolderArtifact.abi);

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);

const addresses = {
  // channels
  t: undefined, // target
  g: undefined, // guarantor
  // externals
  I: ethers.Wallet.createRandom().address.padEnd(66, '0'),
  A: ethers.Wallet.createRandom().address.padEnd(66, '0'),
  B: ethers.Wallet.createRandom().address.padEnd(66, '0'),
};
let AssetHolder: ethers.Contract;

beforeAll(async () => {
  AssetHolder = await setupContracts(provider, AssetHolderArtifact);
});

const reason5 =
  'claimAll | submitted data does not match outcomeHash stored against targetChannelId';
const reason6 =
  'claimAll | submitted data does not match outcomeHash stored against guarantorChannelId';

// 1. claim G1 (step 1 of figure 23 of nitro paper)
// 2. claim G2 (step 2 of figure 23 of nitro paper)
// 3. claim G1 (step 1 of alternative in figure 23 of nitro paper)
// 4. claim G2 (step 2 of alternative of figure 23 of nitro paper)

// amounts are valueString representations of wei
describe('claimAll', () => {
  it.each`
    name                                               | heldBefore | guaranteeDestinations | tOutcomeBefore        | tOutcomeAfter   | heldAfter | payouts         | reason
    ${'1. straight-through guarantee, 3 destinations'} | ${{g: 5}}  | ${['I', 'A', 'B']}    | ${{I: 5, A: 5, B: 5}} | ${{A: 5, B: 5}} | ${{g: 0}} | ${{I: 5}}       | ${undefined}
    ${'2. swap guarantee,             2 destinations'} | ${{g: 5}}  | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${{A: 5}}       | ${{g: 0}} | ${{B: 5}}       | ${undefined}
    ${'3. swap guarantee,             3 destinations'} | ${{g: 5}}  | ${['I', 'B', 'A']}    | ${{I: 5, A: 5, B: 5}} | ${{A: 5, B: 5}} | ${{g: 0}} | ${{I: 5}}       | ${undefined}
    ${'4. straight-through guarantee, 2 destinations'} | ${{g: 5}}  | ${['A', 'B']}         | ${{A: 5, B: 5}}       | ${{B: 5}}       | ${{g: 0}} | ${{A: 5}}       | ${undefined}
    ${'5. allocation not on chain'}                    | ${{g: 5}}  | ${['B', 'A']}         | ${{}}                 | ${{A: 5}}       | ${{g: 0}} | ${{B: 5}}       | ${reason5}
    ${'6. guarantee not on chain'}                     | ${{g: 5}}  | ${[]}                 | ${{A: 5, B: 5}}       | ${{A: 5}}       | ${{g: 0}} | ${{B: 5}}       | ${reason6}
    ${'7. swap guarantee, overfunded, 2 destinations'} | ${{g: 12}} | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${{}}           | ${{g: 2}} | ${{A: 5, B: 5}} | ${undefined}
    ${'8. underspecified guarantee, overfunded      '} | ${{g: 12}} | ${['B']}              | ${{A: 5, B: 5}}       | ${{}}           | ${{g: 2}} | ${{A: 5, B: 5}} | ${undefined}
  `(
    '$name',
    async ({
      name,
      heldBefore,
      guaranteeDestinations,
      tOutcomeBefore,
      tOutcomeAfter,
      heldAfter,
      payouts,
      reason,
    }) => {
      // compute channelIds
      const tNonce = bigNumberify(id(name))
        .maskn(30)
        .toNumber();
      const gNonce = bigNumberify(id(name + 'g'))
        .maskn(30)
        .toNumber();
      const targetId = randomChannelId(tNonce);
      const guarantorId = randomChannelId(gNonce);
      addresses.t = targetId;
      addresses.g = guarantorId;

      // transform input data (unpack addresses and BigNumberify amounts)
      heldBefore = replaceAddresses(heldBefore, addresses);
      tOutcomeBefore = replaceAddresses(tOutcomeBefore, addresses);
      tOutcomeAfter = replaceAddresses(tOutcomeAfter, addresses);
      heldAfter = replaceAddresses(heldAfter, addresses);
      payouts = replaceAddresses(payouts, addresses);
      guaranteeDestinations = guaranteeDestinations.map(x => addresses[x]);

      // set holdings (only works on test contract)
      new Set([...Object.keys(heldAfter), ...Object.keys(heldBefore)]).forEach(async key => {
        // key must be either in heldBefore or heldAfter or both
        const amount = heldBefore[key] ? heldBefore[key] : bigNumberify(0);
        await (await AssetHolder.setHoldings(key, amount)).wait();
        expect((await AssetHolder.holdings(key)).eq(amount)).toBe(true);
      });

      // compute an appropriate allocation.
      const allocation = [];
      Object.keys(tOutcomeBefore).forEach(key =>
        allocation.push({destination: key, amount: tOutcomeBefore[key]}),
      );
      const [, outcomeHash] = allocationToParams(allocation);

      // set outcomeHash for target
      await (await AssetHolder.setAssetOutcomeHashPermissionless(targetId, outcomeHash)).wait();
      expect(await AssetHolder.outcomeHashes(targetId)).toBe(outcomeHash);

      // compute an appropriate guarantee

      const guarantee = {
        destinations: guaranteeDestinations,
        targetChannelId: targetId,
      };

      if (guaranteeDestinations.length > 0) {
        const [, gOutcomeContentHash] = guaranteeToParams(guarantee);

        // set outcomeHash for guarantor
        await (await AssetHolder.setAssetOutcomeHashPermissionless(
          guarantorId,
          gOutcomeContentHash,
        )).wait();
        expect(await AssetHolder.outcomeHashes(guarantorId)).toBe(gOutcomeContentHash);
      }

      const transactionRequest = createClaimAllTransaction(
        AssetHolderInterface,
        guarantorId,
        guarantee,
        allocation,
      );

      // call method in a slightly different way if expecting a revert
      if (reason) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reason + '$',
        );
        await expectRevert(
          () => sendTransaction(provider, AssetHolder.address, transactionRequest),
          regex,
        );
      } else {
        // register for events
        const assetTransferredEvents = [];
        Object.keys(payouts).forEach(key => {
          if (payouts[key].gt(0)) {
            assetTransferredEvents.push(newAssetTransferredEvent(AssetHolder, key));
          }
        });

        await sendTransaction(provider, AssetHolder.address, transactionRequest);

        // catch events
        const resolvedAassetTransferredEvents = await Promise.all(assetTransferredEvents);
        resolvedAassetTransferredEvents.forEach(async (x, index) => {
          if (payouts[index] && payouts[index].gt(0)) {
            expect(x).toEqual(payouts[index]);
          }
        });

        // check new holdings
        Object.keys(heldAfter).forEach(async key =>
          expect(await AssetHolder.holdings(key)).toEqual(heldAfter[key]),
        );

        // check new outcomeHash
        const allocationAfter = [];
        Object.keys(tOutcomeAfter).forEach(key => {
          allocationAfter.push({destination: key, amount: tOutcomeAfter[key]});
        });
        const [, expectedNewOutcomeHash] = allocationToParams(allocationAfter);
        expect(await AssetHolder.outcomeHashes(targetId)).toEqual(expectedNewOutcomeHash);
      }
    },
  );
});
