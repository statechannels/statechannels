import {BigNumber} from 'ethers';
import shuffle from 'lodash.shuffle';
import {Allocation, AllocationType} from '@statechannels/exit-format';

import {getTestProvider, randomExternalDestination, setupContract} from '../../test-helpers';
import {TESTNitroAdjudicator} from '../../../typechain/TESTNitroAdjudicator';
// eslint-disable-next-line import/order
import TESTNitroAdjudicatorArtifact from '../../../artifacts/contracts/test/TESTNitroAdjudicator.sol/TESTNitroAdjudicator.json';

const testNitroAdjudicator = (setupContract(
  getTestProvider(),
  TESTNitroAdjudicatorArtifact,
  process.env.TEST_NITRO_ADJUDICATOR_ADDRESS
) as unknown) as TESTNitroAdjudicator;

import {computeTransferEffectsAndInteractions} from '../../../src/contract/multi-asset-holder';

const randomAllocations = (numAllocations: number): Allocation[] => {
  return numAllocations > 0
    ? [...Array(numAllocations)].map(() => ({
        destination: randomExternalDestination(),
        amount: BigNumber.from(Math.ceil(Math.random() * 10)).toHexString(),
        metadata: '0x',
        allocationType: AllocationType.simple,
      }))
    : [];
};

const heldBefore = BigNumber.from(100).toHexString();
const allocation = randomAllocations(Math.floor(Math.random() * 20));
const indices = shuffle([...Array(allocation.length).keys()]); // [0, 1, 2, 3,...] but shuffled
// TODO -- does it make sense to test with indices that don't increase when the chain requires that they do?

describe('MultiAssetHolder.compute_transfer_effects_and_interactions', () => {
  it(`matches on chain method for input \n heldBefore: ${heldBefore}, \n allocation: ${JSON.stringify(
    allocation,
    null,
    2
  )}, \n indices: ${indices}`, async () => {
    // check local function works as expected
    const locallyComputedNewAllocation = computeTransferEffectsAndInteractions(
      heldBefore,
      allocation,
      indices
    );

    const result = await testNitroAdjudicator.compute_transfer_effects_and_interactions(
      heldBefore,
      allocation,
      indices
    );
    expect(result).toBeDefined();
    expect(result.newAllocations).toMatchObject(
      locallyComputedNewAllocation.newAllocations.map(a => ({
        ...a,
        amount: BigNumber.from(a.amount),
      }))
    );

    expect(result.allocatesOnlyZeros).toEqual(locallyComputedNewAllocation.allocatesOnlyZeros);

    expect(result.exitAllocations).toMatchObject(
      locallyComputedNewAllocation.exitAllocations.map(a => ({
        ...a,
        amount: BigNumber.from(a.amount),
      }))
    );

    expect(result.totalPayouts).toEqual(BigNumber.from(locallyComputedNewAllocation.totalPayouts));
  });
});
