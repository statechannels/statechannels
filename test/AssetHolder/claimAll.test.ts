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
  sendTransaction,
  replaceAddresses,
} from '../test-helpers';
import {createClaimAllTransaction} from '../../src/transaction-creators/asset-holder';
import {id, bigNumberify} from 'ethers/utils';

const AssetHolderInterface = new ethers.utils.Interface(AssetHolderArtifact.abi);

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);

const addresses = {
  // channels
  c: undefined, // target
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

const reason4 =
  'claimAll | submitted data does not match outcomeHash stored against guaranteedChannelId';
const reason5 = 'claimAll | submitted data does not match outcomeHash stored against channelId';

// ${'(swap guarantee, 2 destinations)'}             | ${[A, B]}    | ${['5', '5']}         | ${[A]}                | ${['5']}        | ${101}    | ${[I, B, A]} | ${'5'}       | ${'0'} | ${[true, true]}  | ${['0', '5']}      | ${undefined}
// ${'(swap guarantee, 3 destinations)'}             | ${[I, A, B]} | ${['5', '5', '5']}    | ${[A, B]}             | ${['5', '5']}   | ${100}    | ${[I, B, A]} | ${'5'}       | ${'0'} | ${[true, true]}  | ${['5', '0', '0']} | ${undefined}
// ${'(straight-through guarantee, 2 destinations)'} | ${[A, B]}    | ${['5', '5']}         | ${[B]}                | ${['5']}        | ${103}    | ${[I, A, B]} | ${'5'}       | ${'0'} | ${[true, true]}  | ${['5', '0']}      | ${undefined}
// ${'allocation not on chain'}                      | ${[A, B]}    | ${['5', '5']}         | ${[B]}                | ${['5']}        | ${103}    | ${[I, A, B]} | ${'5'}       | ${'0'} | ${[false, true]} | ${['5', '0']}      | ${reason4}
// ${'guarantee not on chain'}                       | ${[A, B]}    | ${['5', '5']}         | ${[B]}                | ${['5']}        | ${103}    | ${[I, A, B]} | ${'5'}       | ${'0'} | ${[true, false]} | ${['5', '0']}      | ${reason5}

// amounts are valueString representations of wei
describe('claimAll', () => {
  it.each`
    name                                            | heldBefore | guaranteeDestinations | cOutcomeBefore        | cOutcomeAfter   | heldAfter | payouts   | reason
    ${'straight-through guarantee, 3 destinations'} | ${{g: 5}}  | ${['I', 'A', 'B']}    | ${{I: 5, A: 5, B: 5}} | ${{A: 5, B: 5}} | ${{g: 0}} | ${{I: 5}} | ${undefined}
  `(
    '$name',
    async ({
      name,
      heldBefore,
      guaranteeDestinations,
      cOutcomeBefore,
      cOutcomeAfter,
      heldAfter,
      payouts,
      reason,
    }) => {
      // compute channelIds
      const cNonce = bigNumberify(id(name))
        .maskn(30)
        .toNumber();
      const gNonce = bigNumberify(id(name + 'g'))
        .maskn(30)
        .toNumber();
      const targetId = randomChannelId(cNonce);
      const guarantorId = randomChannelId(gNonce);
      addresses.c = targetId;
      addresses.g = guarantorId;

      // transform input data (unpack addresses and BigNumberify amounts)
      heldBefore = replaceAddresses(heldBefore, addresses);
      cOutcomeBefore = replaceAddresses(cOutcomeBefore, addresses);
      cOutcomeAfter = replaceAddresses(cOutcomeAfter, addresses);
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
      Object.keys(cOutcomeBefore).forEach(key =>
        allocation.push({destination: key, amount: cOutcomeBefore[key]}),
      );
      const [_, outcomeHash] = allocationToParams(allocation);

      // set outcomeHash for target
      await (await AssetHolder.setOutcomePermissionless(targetId, outcomeHash)).wait();
      expect(await AssetHolder.outcomeHashes(targetId)).toBe(outcomeHash);

      // compute an appropriate guarantee
      const guarantee = {
        destinations: guaranteeDestinations,
        guaranteedChannelAddress: targetId,
      };
      const [__, gOutcomeContentHash] = guaranteeToParams(guarantee);

      // set outcomeHash for guarantor
      await (await AssetHolder.setOutcomePermissionless(guarantorId, gOutcomeContentHash)).wait();
      expect(await AssetHolder.outcomeHashes(guarantorId)).toBe(gOutcomeContentHash);

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
        resolvedAassetTransferredEvents.forEach(async (x, index, array) => {
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
        Object.keys(cOutcomeAfter).forEach(key => {
          allocationAfter.push({destination: key, amount: cOutcomeAfter[key]});
        });
        const [___, expectedNewOutcomeHash] = allocationToParams(allocationAfter);
        expect(await AssetHolder.outcomeHashes(targetId)).toEqual(expectedNewOutcomeHash);
      }
    },
  );
});
