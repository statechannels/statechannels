import {expectRevert} from '@statechannels/devtools';
import {Contract, ethers, utils} from 'ethers';

const {HashZero} = ethers.constants;
import HashLockArtifact from '../../../../artifacts/contracts/examples/HashLock.sol/HashLock.json';
import {Bytes32} from '../../../../src';
import {Allocation, encodeOutcome} from '../../../../src/contract/outcome';
import {VariablePart} from '../../../../src/contract/state';
import {Bytes} from '../../../../src/contract/types';
import {
  getTestProvider,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContracts,
} from '../../../test-helpers';

// Utilities
// TODO: move to a src file
interface HashLockData {
  h: Bytes32;
  preImage: Bytes;
}

function encodeHashLockData(data: HashLockData): string {
  return utils.defaultAbiCoder.encode(['tuple(bytes32 h, bytes preImage)'], [data]);
}
// *****

let hashTimeLock: Contract;

const numParticipants = 2;
const addresses = {
  // Participants
  Sender: randomExternalDestination(),
  Receiver: randomExternalDestination(),
};
const provider = getTestProvider();

beforeAll(async () => {
  hashTimeLock = await setupContracts(provider, HashLockArtifact, process.env.HASH_LOCK_ADDRESS);
});

const preImage = '0xdeadbeef';
const conditionalPayment: HashLockData = {
  h: utils.keccak256(preImage),
  // ^^^^ important field (SENDER)
  preImage: '0x',
};

const correctPreImage: HashLockData = {
  preImage: preImage,
  // ^^^^ important field (RECEIVER)
  h: HashZero,
};

const incorrectPreImage: HashLockData = {
  preImage: '0xdeadc0de',
  // ^^^^ important field (RECEIVER)
  h: HashZero,
};

describe('validTransition', () => {
  it.each`
    isValid  | dataA                 | balancesA                   | turnNumB | dataB                | balancesB                   | description
    ${true}  | ${conditionalPayment} | ${{Sender: 1, Receiver: 0}} | ${4}     | ${correctPreImage}   | ${{Sender: 0, Receiver: 1}} | ${'Receiver unlocks the conditional payment'}
    ${false} | ${conditionalPayment} | ${{Sender: 1, Receiver: 0}} | ${4}     | ${incorrectPreImage} | ${{Sender: 0, Receiver: 1}} | ${'Receiver cannot unlock with incorrect preimage'}
  `(
    '$description',
    async ({
      isValid,
      dataA,
      balancesA,
      turnNumB,
      dataB,
      balancesB,
    }: {
      isValid;
      dataA;
      balancesA;
      turnNumB;
      dataB;
      balancesB;
    }) => {
      balancesA = replaceAddressesAndBigNumberify(balancesA, addresses);
      const allocationA: Allocation = [];
      Object.keys(balancesA).forEach(key =>
        allocationA.push({destination: key, amount: balancesA[key]})
      );
      const outcomeA = [
        {assetHolderAddress: ethers.constants.AddressZero, allocationItems: allocationA},
      ];
      const variablePartA: VariablePart = {
        outcome: encodeOutcome(outcomeA),
        appData: encodeHashLockData(dataA),
      };
      balancesB = replaceAddressesAndBigNumberify(balancesB, addresses);
      const allocationB: Allocation = [];
      Object.keys(balancesB).forEach(key =>
        allocationB.push({destination: key, amount: balancesB[key]})
      );
      const outcomeB = [
        {assetHolderAddress: ethers.constants.AddressZero, allocationItems: allocationB},
      ];
      const variablePartB: VariablePart = {
        outcome: encodeOutcome(outcomeB),
        appData: encodeHashLockData(dataB),
      };

      if (isValid) {
        const isValidFromCall = await hashTimeLock.validTransition(
          variablePartA,
          variablePartB,
          turnNumB,
          numParticipants
        );
        expect(isValidFromCall).toBe(true);
      } else {
        await expectRevert(
          () =>
            hashTimeLock.validTransition(variablePartA, variablePartB, turnNumB, numParticipants),
          'Incorrect preimage'
        );
      }
    }
  );
});
