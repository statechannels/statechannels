import {Contract} from 'ethers';

import ForceMoveArtifact from '../../../artifacts/contracts/test/TESTForceMove.sol/TESTForceMove.json';
import {getTestProvider, setupContract} from '../../test-helpers';

const provider = getTestProvider();
let ForceMove: Contract;

beforeAll(async () => {
  ForceMove = setupContract(provider, ForceMoveArtifact, process.env.TEST_FORCE_MOVE_ADDRESS);
});

interface TestCase {
  numParticipants: number;
  numStates: number;
  numSigs: number;
  numWhoSignedWhats: number;
}

async function checkGoodCaseAgainstContract(testCase: TestCase) {
  expect(
    await ForceMove.requireValidInput(
      testCase.numParticipants,
      testCase.numStates,
      testCase.numSigs,
      testCase.numWhoSignedWhats
    )
  ).toBe(true);
}

async function checkBadCaseAgainstContract(testCase: TestCase) {
  await expect(async () =>
    ForceMove.requireValidInput(
      testCase.numParticipants,
      testCase.numStates,
      testCase.numSigs,
      testCase.numWhoSignedWhats
    )
  ).rejects.toThrow(/ForceMove |/);
}

// prettier-ignore
const goodTable: TestCase[] = [
  { numParticipants: 9, numStates: 9, numSigs: 9, numWhoSignedWhats: 9 },
  { numParticipants: 8, numStates: 8, numSigs: 8, numWhoSignedWhats: 8 },
  { numParticipants: 7, numStates: 7, numSigs: 7, numWhoSignedWhats: 7 },
  { numParticipants: 6, numStates: 1, numSigs: 6, numWhoSignedWhats: 6 },
  { numParticipants: 5, numStates: 1, numSigs: 5, numWhoSignedWhats: 5 },
];

// prettier-ignore
const badTable: TestCase[] = [
  { numParticipants: 256, numStates: 256, numSigs: 256, numWhoSignedWhats: 256 },
  { numParticipants: 1, numStates: 0, numSigs: 1, numWhoSignedWhats: 1 },
  { numParticipants: 2, numStates: 3, numSigs: 3, numWhoSignedWhats: 3 },
  { numParticipants: 2, numStates: 3, numSigs: 2, numWhoSignedWhats: 2 },
];

describe('requireValidInput', () => {
  it.each(goodTable)('Valid input: %o', checkGoodCaseAgainstContract);
  it.each(badTable)('Invalid input: %o', checkBadCaseAgainstContract);
});
