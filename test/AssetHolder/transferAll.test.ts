import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import AssetHolderArtifact from '../../build/contracts/TESTAssetHolder.json';
import {setupContracts, newAssetTransferredEvent, randomChannelId} from '../test-helpers';
import {defaultAbiCoder, keccak256} from 'ethers/utils';
import {HashZero} from 'ethers/constants';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
const signer0 = provider.getSigner(0); // convention matches setupContracts function
let signer0Address;
let AssetHolder: ethers.Contract;
let assetTransferredEvent;
const chainId = 1234;
const participants = ['', '', ''];

function allocationToParams(allocation) {
  const allocationBytes = defaultAbiCoder.encode(
    ['tuple(bytes32 destination, uint256 amount)[]'],
    [allocation],
  );
  const labelledAllocationOrGuarantee = [0, allocationBytes];
  const outcomeContent = defaultAbiCoder.encode(
    ['tuple(uint8, bytes)'],
    [labelledAllocationOrGuarantee],
  );
  const outcomeHash = keccak256(outcomeContent);
  return [allocationBytes, outcomeHash];
}

beforeAll(async () => {
  AssetHolder = await setupContracts(provider, AssetHolderArtifact);
  signer0Address = await signer0.getAddress();
});

const description0 = 'Reverts transferAll tx when outcomeHash does not match';
const description1 =
  'Pays out all holdings from directly-funded channel allocating to a single external address';
const description2 =
  'Pays out some of the holdings when directly-overfunded channel allocates  assets to a single external address';
const description3 =
  'Pays out all of the holdings when directly-underfunded channel allocates assets to a single external address';
const description4 =
  'Transfers holdings when directly-funded channel allocates assets to a single channel';

// amounts are valueString represenationa of wei
describe('transferAll', () => {
  it.each`
    description     | channelNonce | held   | allocated | beneficiaryExternal | amount | outcomeSet | reasonString
    ${description0} | ${0}         | ${'1'} | ${'0'}    | ${true}             | ${'1'} | ${false}   | ${'transferAll | submitted data does not match stored outcomeHash'}
    ${description1} | ${1}         | ${'1'} | ${'1'}    | ${true}             | ${'1'} | ${true}    | ${undefined}
    ${description2} | ${2}         | ${'2'} | ${'1'}    | ${true}             | ${'1'} | ${true}    | ${undefined}
    ${description3} | ${3}         | ${'2'} | ${'3'}    | ${true}             | ${'2'} | ${true}    | ${undefined}
    ${description4} | ${4}         | ${'2'} | ${'3'}    | ${false}            | ${'2'} | ${true}    | ${undefined}
  `(
    '$description',
    async ({
      channelNonce,
      held,
      allocated,
      beneficiaryExternal,
      amount,
      outcomeSet,
      reasonString,
    }) => {
      held = ethers.utils.parseUnits(held, 'wei');
      amount = ethers.utils.parseUnits(amount, 'wei');
      allocated = ethers.utils.parseUnits(allocated, 'wei');

      let destination;
      if (beneficiaryExternal) {
        destination = signer0Address.padEnd(66, '0');
      } else {
        // populate participants array (every test run targets a unique channel)
        for (let i = 0; i < 3; i++) {
          participants[i] = ethers.Wallet.createRandom().address;
        }
        // compute channelId
        destination = randomChannelId(channelNonce * 999);
      }

      // compute channelId
      const channelId = randomChannelId(channelNonce);

      // set holdings (only works on test contract)
      if (held > 0) {
        await (await AssetHolder.setHoldings(channelId, held)).wait();
        expect(await AssetHolder.holdings(channelId)).toEqual(held);
      }

      // compute an appropriate allocation
      const allocation = [{destination, amount: allocated}]; // sufficient
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
        if (beneficiaryExternal) {
          // register for events
          assetTransferredEvent = newAssetTransferredEvent(AssetHolder, destination);
        }

        // submit tx
        const tx = await AssetHolder.transferAll(channelId, allocationBytes);
        // wait for tx to be mined
        await tx.wait();

        if (beneficiaryExternal) {
          // catch event
          expect(await assetTransferredEvent).toEqual(amount);
        }

        // check new holdings
        expect(await AssetHolder.holdings(channelId)).toEqual(held.sub(amount));
        if (!beneficiaryExternal) {
          expect(await AssetHolder.holdings(destination)).toEqual(amount);
        }

        // check new outcomeHash
        let expectedOutcomeHash;
        let _;
        if (allocated.sub(amount).eq(0)) {
          expectedOutcomeHash = HashZero;
        } else {
          const newAllocation = [{destination, amount: allocated.sub(amount)}]; // sufficient
          [_, expectedOutcomeHash] = allocationToParams(newAllocation);
        }

        expect(await AssetHolder.outcomeHashes(channelId)).toEqual(expectedOutcomeHash);
      }
    },
  );
});
