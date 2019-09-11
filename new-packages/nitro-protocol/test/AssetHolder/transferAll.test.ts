import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import AssetHolderArtifact from '../../build/contracts/TESTAssetHolder.json';
import {
  setupContracts,
  newAssetTransferredEvent,
  randomChannelId,
  allocationToParams,
  sendTransaction,
  transformInputData,
} from '../test-helpers';
import {HashZero} from 'ethers/constants';
import {createTransferAllTransaction} from '../../src/transaction-creators/asset-holder';
const AssetHolderInterface = new ethers.utils.Interface(AssetHolderArtifact.abi);
import {id, bigNumberify} from 'ethers/utils';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);

let AssetHolder: ethers.Contract;

const addresses = {
  // channels
  c: undefined,
  C: randomChannelId(),
  X: randomChannelId(),
  // externals
  A: ethers.Wallet.createRandom().address.padEnd(66, '0'),
  B: ethers.Wallet.createRandom().address.padEnd(66, '0'),
};

beforeAll(async () => {
  AssetHolder = await setupContracts(provider, AssetHolderArtifact);
});

const description0 = ' 0. Reverts transferAll tx when outcomeHash does not match';
const reason1 = 'transferAll | submitted data does not match stored outcomeHash';
const description1 =
  ' 1. Pays out all holdings from directly-funded channel allocating to a single external address';
const description2 =
  ' 2. Pays out some of the holdings when directly-overfunded channel allocates assets to a single external address';
const description3 =
  ' 3. Pays out all of the holdings when directly-underfunded channel allocates assets to a single external address';
const description4 =
  ' 4. Transfers all holdings from directly-funded channel allocating to a single channel';
const description5 =
  ' 5. Transfers all holdings from directly-overfunded channel allocating to a single channel';
const description6 =
  ' 6. Transfers all holdings from directly-underfunded channel allocating to a single channel';
const description7 =
  ' 7. Transfers all holdings from directly-funded channel allocating to two external addresses (full payout, full payout)';
const description8 =
  ' 8. Transfers all holdings from directly-funded channel allocating to two external addresses (full payout, no payout)';
const description9 =
  ' 9. Transfers all holdings from directly-funded channel allocating to two external addresses (full payout, partial payout)';
const description10 =
  '10. Transfers all holdings from directly-funded channel allocating to two channels (full payout, full payout)';
const description11 =
  '11. Transfers all holdings from directly-funded channel allocating to two channels (full payout, no payout)';
const description12 =
  '12. Transfers all holdings from directly-funded channel allocating to two channels (full payout, partial payout)';

// ${description1}  | ${true}    | ${1} | ${[A]}     | ${['1']}      | ${[]}     | ${[]}        | ${[]}       | ${[]}            | ${[]}         | ${'0'}    | ${undefined}
// ${description2}  | ${true}    | ${2} | ${[A]}     | ${['1']}      | ${[]}     | ${[]}        | ${[]}       | ${[]}            | ${['1']}      | ${'1'}    | ${undefined}
// ${description3}  | ${true}    | ${1} | ${[A]}     | ${['2']}      | ${[A]}    | ${['1']}     | ${[]}       | ${[]}            | ${['1']}      | ${'0'}    | ${undefined}
// ${description4}  | ${true}    | ${1} | ${[C]}     | ${['1']}      | ${[]}     | ${[]}        | ${[C]}      | ${['1']}         | ${[]}         | ${'0'}    | ${undefined}
// ${description5}  | ${true}    | ${2} | ${[C]}     | ${['1']}      | ${[]}     | ${[]}        | ${[C]}      | ${['1']}         | ${[]}         | ${'1'}    | ${undefined}
// ${description6}  | ${true}    | ${1} | ${[C]}     | ${['2']}      | ${[C]}    | ${['1']}     | ${[C]}      | ${['1']}         | ${[]}         | ${'0'}    | ${undefined}
// ${description7}  | ${true}    | ${2} | ${[A, B]}  | ${['1', '1']} | ${[]}     | ${[]}        | ${[]}       | ${[]}            | ${['1', '1']} | ${'0'}    | ${undefined}
// ${description8}  | ${true}    | ${1} | ${[A, B]}  | ${['1', '1']} | ${[B]}    | ${['1']}     | ${[]}       | ${[]}            | ${['1']}      | ${'0'}    | ${undefined}
// ${description9}  | ${true}    | ${3} | ${[A, B]}  | ${['2', '2']} | ${[B]}    | ${['1']}     | ${[]}       | ${[]}            | ${['2', '1']} | ${'0'}    | ${undefined}
// ${description10} | ${true}    | ${2} | ${[C, X]}  | ${['1', '1']} | ${[]}     | ${[]}        | ${[C, X]}   | ${['1', '1']}    | ${[]}         | ${'0'}    | ${undefined}
// ${description11} | ${true}    | ${1} | ${[C, X]}  | ${['1', '1']} | ${[X]}    | ${['1']}     | ${[C]}      | ${['1']}         | ${[]}         | ${'0'}    | ${undefined}
// ${description12} | ${true}    | ${3} | ${[C, X]}  | ${['2', '2']} | ${[X]}    | ${['1']}     | ${[C, X]}   | ${['2', '1']}    | ${[]}         | ${'0'}    | ${undefined}

// amounts are valueString represenationa of wei
// c is the channel we are transferring from. TODO work out how to track it below
describe('transferAll', () => {
  it.each`
    name                                  | heldBefore | setOutcome | newOutcome | heldAfter | payouts   | reason
    ${'1. Finalized, funded, single EOA'} | ${{c: 1}}  | ${{A: 1}}  | ${{}}      | ${{}}     | ${{A: 1}} | ${undefined}
  `(
    `$name: heldBefore: $heldBefore, setOutcome: $setOutcome, newOutcome: $newOutcome, heldAfter: $heldAfter, payouts: $payouts`,
    async ({name, heldBefore, setOutcome, newOutcome, heldAfter, payouts, reason}) => {
      // compute channelId
      const nonce = bigNumberify(id(name))
        .maskn(30)
        .toNumber();
      const channelId = randomChannelId(nonce);
      addresses.c = channelId;

      // prepare input data
      setOutcome = transformInputData(setOutcome, addresses);
      heldBefore = transformInputData(heldBefore, addresses);
      heldAfter = transformInputData(heldAfter, addresses);
      payouts = transformInputData(payouts, addresses);

      // reset the holdings for any beneficiary channels we expect to be updated
      Object.keys(heldAfter).forEach(async key => {
        await (await AssetHolder.setHoldings(key, 0)).wait();
        expect((await AssetHolder.holdings(key)).eq(0)).toBe(true);
      });

      // set holdings for channelId (only works on test contract)
      if (heldBefore[channelId] > 0) {
        await (await AssetHolder.setHoldings(channelId, heldBefore[channelId])).wait();
        expect(await AssetHolder.holdings(channelId)).toEqual(heldBefore[channelId]);
      }

      // compute an appropriate allocation.
      const allocation = [];
      Object.keys(setOutcome).forEach(key =>
        allocation.push({destination: key, amount: setOutcome[key]}),
      );
      const [_, outcomeHash] = allocationToParams(allocation);

      // set outcomeHash
      await (await AssetHolder.setOutcomePermissionless(channelId, outcomeHash)).wait();
      expect(await AssetHolder.outcomeHashes(channelId)).toBe(outcomeHash);

      const transactionRequest = createTransferAllTransaction(
        AssetHolderInterface,
        channelId,
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
          expect(await AssetHolder.holdings(key).toEqual(heldAfter[key])),
        );

        // check new outcomeHash
        let expectedNewOutcomeHash;
        let __;

        const allocationAfter = [];
        Object.keys(newOutcome).forEach(key => {
          allocationAfter.push({destination: key, amount: newOutcome[key]});
        });
        if (allocationAfter.length > 0) {
          [__, expectedNewOutcomeHash] = allocationToParams(allocationAfter);
        } else {
          expectedNewOutcomeHash = HashZero;
        }
        expect(await AssetHolder.outcomeHashes(channelId)).toEqual(expectedNewOutcomeHash);
      }
    },
  );
});
