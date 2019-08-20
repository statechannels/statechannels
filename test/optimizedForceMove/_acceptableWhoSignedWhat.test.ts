import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import optimizedForceMoveArtifact from '../../build/contracts/TESTOptimizedForceMove.json';
import {setupContracts} from './test-helpers';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let optimizedForceMove: ethers.Contract;

const participants = ['', '', ''];
const wallets = new Array(3);

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  optimizedForceMove = await setupContracts(provider, optimizedForceMoveArtifact);
});

// TODO use .each to improve readability and reduce boilerplate
describe('_acceptableWhoSignedWhat (expect a boolean)', () => {
  it.each`
    whoSignedWhat | largestTurnNum | nParticipants | nStates | expectedResult
    ${[0, 1, 2]}  | ${2}           | ${3}          | ${3}    | ${true}
    ${[0, 1, 2]}  | ${5}           | ${3}          | ${3}    | ${true}
    ${[0, 0, 1]}  | ${2}           | ${3}          | ${2}    | ${true}
    ${[0, 0, 0]}  | ${2}           | ${3}          | ${1}    | ${true}
    ${[0, 0, 0]}  | ${8}           | ${3}          | ${1}    | ${true}
    ${[0, 0, 2]}  | ${2}           | ${3}          | ${3}    | ${false}
    ${[0, 0, 2]}  | ${11}          | ${3}          | ${3}    | ${false}
  `(
    'returns $expectedResult for whoSignedWhat = $whoSignedWhat, largestTurnNum = $largestTurnNum, nParticipants = $nParticipants, nStates = $nStates',
    async ({whoSignedWhat, largestTurnNum, nParticipants, nStates, expectedResult}) => {
      expect(
        await optimizedForceMove.acceptableWhoSignedWhat(
          whoSignedWhat,
          largestTurnNum,
          nParticipants,
          nStates,
        ),
      ).toBe(expectedResult);
    },
  );
});

describe('_acceptableWhoSignedWhat (expect revert)', () => {
  it.each`
    whoSignedWhat | largestTurnNum | nParticipants | nStates | reasonString
    ${[0, 0]}     | ${2}           | ${3}          | ${1}    | ${'_validSignatures: whoSignedWhat must be the same length as participants'}
  `(
    'reverts for whoSignedWhat = $whoSignedWhat, largestTurnNum = $largestTurnNum, nParticipants = $nParticipants, nStates = $nStates',
    async ({whoSignedWhat, largestTurnNum, nParticipants, nStates, reasonString}) => {
      await expectRevert(
        () =>
          optimizedForceMove.acceptableWhoSignedWhat(
            whoSignedWhat,
            largestTurnNum,
            nParticipants,
            nStates,
          ),
        reasonString,
      );
    },
  );
});
