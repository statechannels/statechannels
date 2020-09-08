import {expectRevert} from '@statechannels/devtools';
// @ts-ignore
import {Contract, BigNumber, utils} from 'ethers';

import AssetHolderArtifact from '../../../build/contracts/TESTAssetHolder.json';
import {
  allocationToParams,
  getTestProvider,
  randomChannelId,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContracts,
} from '../../test-helpers';
import {encodeAllocation} from '../../../src/contract/outcome';

const provider = getTestProvider();

let AssetHolder: Contract;

const addresses = {
  // Channels
  c: undefined,
  C: randomChannelId(),
  X: randomChannelId(),
  // Externals
  A: randomExternalDestination(),
  B: randomExternalDestination(),
};

beforeAll(async () => {
  AssetHolder = await setupContracts(
    provider,
    AssetHolderArtifact,
    process.env.TEST_ASSET_HOLDER_ADDRESS
  );
});

const reason0 = 'transferAll | submitted data does not match stored assetOutcomeHash';

// C is the channel we are transferring from.
describe('transferAll', () => {
  it.each`
    name                              | heldBefore | setOutcome      | newOutcome | heldAfter             | payouts         | reason
    ${' 0. outcome not set         '} | ${{c: 1}}  | ${{}}           | ${{}}      | ${{}}                 | ${{A: 1}}       | ${reason0}
    ${' 1. funded          -> 1 EOA'} | ${{c: 1}}  | ${{A: 1}}       | ${{}}      | ${{}}                 | ${{A: 1}}       | ${undefined}
    ${' 2. overfunded      -> 1 EOA'} | ${{c: 2}}  | ${{A: 1}}       | ${{}}      | ${{c: 1}}             | ${{A: 1}}       | ${undefined}
    ${' 3. underfunded     -> 1 EOA'} | ${{c: 1}}  | ${{A: 2}}       | ${{A: 1}}  | ${{}}                 | ${{A: 1}}       | ${undefined}
    ${' 4. funded      -> 1 channel'} | ${{c: 1}}  | ${{C: 1}}       | ${{}}      | ${{c: 0, C: 1}}       | ${{}}           | ${undefined}
    ${' 5. overfunded  -> 1 channel'} | ${{c: 2}}  | ${{C: 1}}       | ${{}}      | ${{c: 1, C: 1}}       | ${{}}           | ${undefined}
    ${' 6. underfunded -> 1 channel'} | ${{c: 1}}  | ${{C: 2}}       | ${{C: 1}}  | ${{c: 0, C: 1}}       | ${{}}           | ${undefined}
    ${' 7. -> 2 EOA       full/full'} | ${{c: 2}}  | ${{A: 1, B: 1}} | ${{}}      | ${{c: 0}}             | ${{A: 1, B: 1}} | ${undefined}
    ${' 8. -> 2 EOA         full/no'} | ${{c: 1}}  | ${{A: 1, B: 1}} | ${{B: 1}}  | ${{c: 0}}             | ${{A: 1}}       | ${undefined}
    ${' 9. -> 2 EOA    full/partial'} | ${{c: 3}}  | ${{A: 2, B: 2}} | ${{B: 1}}  | ${{c: 0}}             | ${{A: 2, B: 1}} | ${undefined}
    ${'10. -> 2 chan      full/full'} | ${{c: 2}}  | ${{C: 1, X: 1}} | ${{}}      | ${{c: 0, C: 1, X: 1}} | ${{}}           | ${undefined}
    ${'11. -> 2 chan        full/no'} | ${{c: 1}}  | ${{C: 1, X: 1}} | ${{X: 1}}  | ${{c: 0, C: 1, X: 0}} | ${{}}           | ${undefined}
    ${'12. -> 2 chan   full/partial'} | ${{c: 3}}  | ${{C: 2, X: 2}} | ${{X: 1}}  | ${{c: 0, C: 2, X: 1}} | ${{}}           | ${undefined}
  `(
    `$name: heldBefore: $heldBefore, setOutcome: $setOutcome, newOutcome: $newOutcome, heldAfter: $heldAfter, payouts: $payouts`,
    async ({name, heldBefore, setOutcome, newOutcome, heldAfter, payouts, reason}) => {
      // Compute channelId
      const nonce = BigNumber.from(utils.id(name))
        .mask(30)
        .toNumber();
      const channelId = randomChannelId(nonce);
      addresses.c = channelId;

      // Transform input data (unpack addresses and BigNumberify amounts)
      heldBefore = replaceAddressesAndBigNumberify(heldBefore, addresses);
      setOutcome = replaceAddressesAndBigNumberify(setOutcome, addresses);
      newOutcome = replaceAddressesAndBigNumberify(newOutcome, addresses);
      heldAfter = replaceAddressesAndBigNumberify(heldAfter, addresses);
      payouts = replaceAddressesAndBigNumberify(payouts, addresses);

      // Reset the holdings (only works on test contract)
      new Set([...Object.keys(heldAfter), ...Object.keys(heldBefore)]).forEach(async key => {
        // Key must be either in heldBefore or heldAfter or both
        const amount = heldBefore[key] ? heldBefore[key] : BigNumber.from(0);
        await (await AssetHolder.setHoldings(key, amount)).wait();
        expect((await AssetHolder.holdings(key)).eq(amount)).toBe(true);
      });

      // Compute an appropriate allocation.
      const allocation = [];
      Object.keys(setOutcome).forEach(key =>
        allocation.push({destination: key, amount: setOutcome[key]})
      );
      const [, assetOutcomeHash] = allocationToParams(allocation);

      // Set assetOutcomeHash
      await (
        await AssetHolder.setAssetOutcomeHashPermissionless(channelId, assetOutcomeHash)
      ).wait();
      expect(await AssetHolder.assetOutcomeHashes(channelId)).toBe(assetOutcomeHash);

      const tx = AssetHolder.transferAll(channelId, encodeAllocation(allocation));

      // Call method in a slightly different way if expecting a revert
      if (reason) {
        await expectRevert(() => tx, reason);
      } else {
        const {events} = await (await tx).wait();
        const expectedEvents = [];
        Object.keys(payouts).forEach(destination => {
          if (payouts[destination] && payouts[destination].gt(0)) {
            expectedEvents.push({
              event: 'AssetTransferred',
              args: {channelId, destination, amount: payouts[destination]},
            });
          }
        });
        expect(events).toMatchObject(expectedEvents);
        // Check new holdings
        Object.keys(heldAfter).forEach(async key =>
          expect(await AssetHolder.holdings(key)).toEqual(heldAfter[key])
        );

        // Check new assetOutcomeHash
        const allocationAfter = [];
        Object.keys(newOutcome).forEach(key => {
          allocationAfter.push({destination: key, amount: newOutcome[key]});
        });
        const [, expectedNewOutcomeHash] = allocationToParams(allocationAfter);
        expect(await AssetHolder.assetOutcomeHashes(channelId)).toEqual(expectedNewOutcomeHash);
      }
    }
  );
});
