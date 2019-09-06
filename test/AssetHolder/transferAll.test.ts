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
const signer0 = provider.getSigner(0);
const signer1 = provider.getSigner(1);
let signer0Address;
let signer1Address;
let AssetHolder: ethers.Contract;
let assetTransferredEvent;
let assetTransferredEvent0;
let assetTransferredEvent1;
const participants = ['', '', ''];

beforeAll(async () => {
  AssetHolder = await setupContracts(provider, AssetHolderArtifact);
  signer0Address = await signer0.getAddress();
  signer1Address = await signer1.getAddress();
});

const description0 = 'Reverts transferAll tx when outcomeHash does not match';
const description1 =
  'Pays out all holdings from directly-funded channel allocating to a single external address';
const description2 =
  'Pays out some of the holdings when directly-overfunded channel allocates assets to a single external address';
const description3 =
  'Pays out all of the holdings when directly-underfunded channel allocates assets to a single external address';
const description4 =
  'Transfers all holdings from directly-funded channel allocating to a single channel';
const description5 =
  'Transfers all holdings from directly-overfunded channel allocating to a single channel';
const description6 =
  'Transfers all holdings from directly-underfunded channel allocating to a single channel';

// amounts are valueString represenationa of wei
describe('transferAll (single beneficiary)', () => {
  it.each`
    description     | channelNonce | held   | allocated | beneficiaryExternal | amount | outcomeSet | reasonString
    ${description0} | ${0}         | ${'1'} | ${'0'}    | ${true}             | ${'1'} | ${false}   | ${'transferAll | submitted data does not match stored outcomeHash'}
    ${description1} | ${1}         | ${'1'} | ${'1'}    | ${true}             | ${'1'} | ${true}    | ${undefined}
    ${description2} | ${2}         | ${'2'} | ${'1'}    | ${true}             | ${'1'} | ${true}    | ${undefined}
    ${description3} | ${3}         | ${'2'} | ${'3'}    | ${true}             | ${'2'} | ${true}    | ${undefined}
    ${description4} | ${4}         | ${'1'} | ${'1'}    | ${false}            | ${'1'} | ${true}    | ${undefined}
    ${description5} | ${5}         | ${'2'} | ${'1'}    | ${false}            | ${'1'} | ${true}    | ${undefined}
    ${description6} | ${6}         | ${'2'} | ${'3'}    | ${false}            | ${'2'} | ${true}    | ${undefined}
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

const description9 =
  'Transfers all holdings from directly-funded channel allocating to two external addresses (full payout, full payout)';
const description10 =
  'Transfers all holdings from directly-funded channel allocating to two external addresses (full payout, no payout)';
const description11 =
  'Transfers all holdings from directly-funded channel allocating to two external addresses (full payout, partial payout)';

describe('transferAll (two beneficiaries)', () => {
  it.each`
    description      | channelNonce | held   | allocated     | beneficiaryExternal | amount        | outcomeSet | reasonString
    ${description9}  | ${9}         | ${'2'} | ${['1', '1']} | ${[true, true]}     | ${['1', '1']} | ${true}    | ${undefined}
    ${description10} | ${10}        | ${'1'} | ${['1', '1']} | ${[true, true]}     | ${['1', '0']} | ${true}    | ${undefined}
    ${description11} | ${11}        | ${'3'} | ${['2', '2']} | ${[true, true]}     | ${['2', '1']} | ${true}    | ${undefined}
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
      amount[0] = ethers.utils.parseUnits(amount[0], 'wei');
      amount[1] = ethers.utils.parseUnits(amount[1], 'wei');
      allocated[0] = ethers.utils.parseUnits(allocated[0], 'wei');
      allocated[1] = ethers.utils.parseUnits(allocated[1], 'wei');

      const destination0 = beneficiaryExternal[0]
        ? signer0Address.padEnd(66, '0')
        : randomChannelId(channelNonce * 111);
      const destination1 = beneficiaryExternal[1]
        ? signer1Address.padEnd(66, '0')
        : randomChannelId(channelNonce * 222);

      // compute channelId
      const channelId = randomChannelId(channelNonce);

      // set holdings (only works on test contract)
      if (held > 0) {
        await (await AssetHolder.setHoldings(channelId, held)).wait();
        expect(await AssetHolder.holdings(channelId)).toEqual(held);
      }

      // compute an appropriate allocation
      const allocation = [
        {destination: destination0, amount: allocated[0]},
        {destination: destination1, amount: allocated[1]},
      ];
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
        if (beneficiaryExternal[0] && amount[0].gt(0)) {
          // register for events
          assetTransferredEvent0 = newAssetTransferredEvent(AssetHolder, destination0);
        } else {
          assetTransferredEvent0 = undefined;
        }
        if (beneficiaryExternal[1] && amount[1].gt(0)) {
          // register for events
          assetTransferredEvent1 = newAssetTransferredEvent(AssetHolder, destination1);
        } else {
          assetTransferredEvent1 = undefined;
        }

        // submit tx
        const tx = await AssetHolder.transferAll(channelId, allocationBytes);

        // wait for tx to be mined
        await tx.wait();

        // wait for all events to be caught
        [assetTransferredEvent0, assetTransferredEvent1] = await Promise.all([
          assetTransferredEvent0,
          assetTransferredEvent1,
        ]);

        if (beneficiaryExternal[0] && amount[0].gt(0)) {
          // catch event
          expect(assetTransferredEvent0).toEqual(amount[0]);
        } else {
          expect(AssetHolder.holdings(destination0)).toEqual(amount[0]);
        }
        if (beneficiaryExternal[1] && amount[1].gt(0)) {
          // catch event
          expect(assetTransferredEvent1).toEqual(amount[1]);
        } else {
          expect(await AssetHolder.holdings(destination1)).toEqual(amount[1]);
        }

        // check new holdings
        expect(await AssetHolder.holdings(channelId)).toEqual(held.sub(amount[0].add(amount[1])));

        // check new outcomeHash
        let expectedOutcomeHash;
        let _;
        if (allocated[0].eq(amount[0]) && allocated[1].eq(amount[1])) {
          expectedOutcomeHash = HashZero;
        } else {
          const newAllocation = [];
          if (allocated[0].sub(amount[0]).gt(0)) {
            newAllocation.push({destination: destination0, amount: allocated[0].sub(amount[0])});
          }
          if (allocated[1].sub(amount[1]).gt(0)) {
            newAllocation.push({destination: destination1, amount: allocated[1].sub(amount[1])});
          }
          [_, expectedOutcomeHash] = allocationToParams(newAllocation);
        }

        expect(await AssetHolder.outcomeHashes(channelId)).toEqual(expectedOutcomeHash);
      }
    },
  );
});
