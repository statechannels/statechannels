import {BigNumber} from 'ethers';
import shuffle from 'lodash.shuffle';

import {getTestProvider, randomExternalDestination, setupContract} from '../../test-helpers';
import {TESTNitroAdjudicator} from '../../../typechain/TESTNitroAdjudicator';
// eslint-disable-next-line import/order
import TESTNitroAdjudicatorArtifact from '../../../artifacts/contracts/test/TESTNitroAdjudicator.sol/TESTNitroAdjudicator.json';

const testNitroAdjudicator = (setupContract(
  getTestProvider(),
  TESTNitroAdjudicatorArtifact,
  process.env.TEST_NITRO_ADJUDICATOR_ADDRESS
) as unknown) as TESTNitroAdjudicator;

import {AllocationItem} from '../../../src';
import {computeNewAllocation} from '../../../src/contract/multi-asset-holder';

const randomAllocation = (numAllocationItems: number): AllocationItem[] => {
  return numAllocationItems > 0
    ? [...Array(numAllocationItems)].map(() => ({
        destination: randomExternalDestination(),
        amount: BigNumber.from(Math.ceil(Math.random() * 10)).toHexString(),
      }))
    : [];
};

const heldBefore = BigNumber.from(100).toHexString();
const allocation = randomAllocation(Math.floor(Math.random() * 20));
const indices = shuffle([...Array(allocation.length).keys()]); // [0, 1, 2, 3,...] but shuffled

describe('AssetHolder._computeNewAllocation', () => {
  it(`matches on chain method for input \n heldBefore: ${heldBefore}, \n allocation: ${JSON.stringify(
    allocation,
    null,
    2
  )}, \n indices: ${indices}`, async () => {
    // check local function works as expected
    const locallyComputedNewAllocation = computeNewAllocation(heldBefore, allocation, indices);

    const result = await testNitroAdjudicator._computeNewAllocation(
      heldBefore,
      allocation,
      indices
    );
    expect(result).toBeDefined();
    expect(result.newAllocation).toMatchObject(
      locallyComputedNewAllocation.newAllocation.map(a => ({
        ...a,
        amount: BigNumber.from(a.amount),
      }))
    );

    expect((result as any).allocatesOnlyZeros).toEqual(
      locallyComputedNewAllocation.allocatesOnlyZeros
    );

    expect(result.payouts).toMatchObject(
      locallyComputedNewAllocation.payouts.map(p => BigNumber.from(p))
    );

    expect(result.totalPayouts).toEqual(BigNumber.from(locallyComputedNewAllocation.totalPayouts));
  });
});