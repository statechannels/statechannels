import {constants} from 'ethers';
import {Allocation, AllocationType} from '@statechannels/exit-format';

import {getTestProvider, setupContract} from '../../test-helpers';
import {TESTNitroAdjudicator} from '../../../typechain/TESTNitroAdjudicator';
// eslint-disable-next-line import/order
import TESTNitroAdjudicatorArtifact from '../../../artifacts/contracts/test/TESTNitroAdjudicator.sol/TESTNitroAdjudicator.json';

const testNitroAdjudicator = (setupContract(
  getTestProvider(),
  TESTNitroAdjudicatorArtifact,
  process.env.TEST_NITRO_ADJUDICATOR_ADDRESS
) as unknown) as TESTNitroAdjudicator;

import {computeClaimEffectsAndInteractions} from '../../../src/contract/multi-asset-holder';
import {encodeGuaranteeData} from '../../../src/contract/outcome';

const Alice = '0x000000000000000000000000000000000000000000000000000000000000000a';
const Bob = '0x000000000000000000000000000000000000000000000000000000000000000b';

interface TestCaseInputs {
  initialHoldings: string;
  sourceAllocations: Allocation[];
  targetAllocations: Allocation[];
  indexOfTargetInSource: number;
  targetAllocationIndicesToPayout: number[];
}

interface TestCaseOutputs {
  newSourceAllocations: Allocation[];
  newTargetAllocations: Allocation[];
  exitAllocations: Allocation[];
  totalPayouts: string;
}
interface TestCase {
  inputs: TestCaseInputs;
  outputs: TestCaseOutputs;
}

const testcase1: TestCase = {
  inputs: {
    initialHoldings: '0x0f', // surplus initially 16
    indexOfTargetInSource: 1,
    targetAllocationIndicesToPayout: [], // meaning 'all'
    sourceAllocations: [
      {
        destination: constants.HashZero,
        amount: '0x08', // decreased to 8
        allocationType: AllocationType.guarantee,
        metadata: encodeGuaranteeData([Alice, Bob]),
      },
      {
        destination: constants.HashZero,
        amount: '0x07', // decreased to 7
        allocationType: AllocationType.guarantee,
        metadata: encodeGuaranteeData([Bob, Alice]),
      },
    ],
    targetAllocations: [
      {
        destination: Alice, // Alice has a low priority. Nothing for her.
        amount: '0x08',
        allocationType: AllocationType.simple,
        metadata: '0x',
      },
      {
        destination: Bob, // Bob has highest priority
        amount: '0x08', // surplus still 7, so 7 afforded for Bob
        allocationType: AllocationType.simple,
        metadata: '0x',
      },
    ],
  },
  outputs: {
    newSourceAllocations: [
      {
        destination: constants.HashZero,
        amount: '0x08',
        allocationType: AllocationType.guarantee,
        metadata: encodeGuaranteeData([Alice, Bob]),
      },
      {
        destination: constants.HashZero,
        amount: '0x00',
        allocationType: AllocationType.guarantee,
        metadata: encodeGuaranteeData([Bob, Alice]),
      },
    ],
    newTargetAllocations: [
      {
        destination: Alice,
        amount: '0x08',
        allocationType: AllocationType.simple,
        metadata: '0x',
      },
      {
        destination: Bob,
        amount: '0x01',
        allocationType: AllocationType.simple,
        metadata: '0x',
      },
    ],
    exitAllocations: [
      {
        destination: Alice,
        amount: '0x00',
        allocationType: AllocationType.simple,
        metadata: '0x',
      },
      {
        destination: Bob,
        amount: '0x07',
        allocationType: AllocationType.simple,
        metadata: '0x',
      },
    ],
    totalPayouts: '0x07',
  },
};

const testCases: TestCase[][] = [[testcase1]];

describe('computeClaimEffectsAndInteractions', () => {
  it.each(testCases)('off chain method matches expectation', (testCase: TestCase) => {
    const offChainResult = computeClaimEffectsAndInteractions(
      testCase.inputs.initialHoldings,
      testCase.inputs.sourceAllocations,
      testCase.inputs.targetAllocations,
      testCase.inputs.indexOfTargetInSource,
      testCase.inputs.targetAllocationIndicesToPayout
    );

    expect(offChainResult.newSourceAllocations).toMatchObject(
      testCase.outputs.newSourceAllocations
    );
    expect(offChainResult.newTargetAllocations).toMatchObject(
      testCase.outputs.newTargetAllocations
    );
    expect(offChainResult.exitAllocations).toMatchObject(testCase.outputs.exitAllocations);
    expect(offChainResult.totalPayouts).toEqual(testCase.outputs.totalPayouts);
  });

  it.each(testCases)('on chain method matches expectation', async (testCase: TestCase) => {
    const onChainResult = await testNitroAdjudicator.compute_claim_effects_and_interactions(
      testCase.inputs.initialHoldings,
      testCase.inputs.sourceAllocations,
      testCase.inputs.targetAllocations,
      testCase.inputs.indexOfTargetInSource,
      testCase.inputs.targetAllocationIndicesToPayout
    );

    expect(onChainResult.newSourceAllocations.map(convertAmountToHexString)).toMatchObject(
      testCase.outputs.newSourceAllocations
    );
    expect(onChainResult.newTargetAllocations.map(convertAmountToHexString)).toMatchObject(
      testCase.outputs.newTargetAllocations
    );
    expect(onChainResult.exitAllocations.map(convertAmountToHexString)).toMatchObject(
      testCase.outputs.exitAllocations
    );
    expect(onChainResult.totalPayouts.toHexString()).toEqual(testCase.outputs.totalPayouts);
  });

  const convertAmountToHexString = a => ({...a, amount: a.amount.toHexString()});
});
