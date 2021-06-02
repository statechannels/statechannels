import {expectRevert} from '@statechannels/devtools';
import {Contract, ethers, utils} from 'ethers';

const {HashZero} = ethers.constants;
// import HashLockedSwapArtifact from '../../../../artifacts/contracts/examples/HashLockedSwap.sol/HashLockedSwap.json';
import TwoOfThreeArtifact from '../../../../artifacts/contracts/examples/TwoOfThree.sol/TwoOfThree.json';
import {Bytes32} from '../../../../src';
import {Allocation, encodeOutcome} from '../../../../src/contract/outcome';
import {VariablePart} from '../../../../src/contract/state';
import {Bytes} from '../../../../src/contract/types';
import {
  getTestProvider,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContract,
} from '../../../test-helpers';

// Utilities
// TODO: move to a src file
interface HashLockedSwapData {
  h: Bytes32;
  preImage: Bytes;
}

function encodeTwoOfThreeData(data: HashLockedSwapData) {
  return utils.defaultAbiCoder.encode(
    ['tuple(address twoPartyApp, bytes twoPartyAppData)'],
    [
      {
        twoPartyApp: process.env.HASH_LOCK_2_ADDRESS,
        twoPartyAppData: encodeHashLockedSwapData(data),
      },
    ]
  );
}

function encodeHashLockedSwapData(data: HashLockedSwapData): string {
  return utils.defaultAbiCoder.encode(['tuple(bytes32 h, bytes preImage)'], [data]);
}
// *****

// let hashTimeLock: Contract;
let twoOfThree: Contract;

const numParticipants = 3;
const addresses = {
  // Participants
  Sender: randomExternalDestination(),
  Receiver: randomExternalDestination(),
  Intermediary: randomExternalDestination(),
};
const provider = getTestProvider();

beforeAll(async () => {
  // hashTimeLock = setupContract(provider, HashLockedSwapArtifact, process.env.HASH_LOCK_2_ADDRESS);
  twoOfThree = setupContract(provider, TwoOfThreeArtifact, process.env.TWO_OF_THREE_ADDRESS);
});

const preImage = '0xdeadbeef';
const conditionalPayment: HashLockedSwapData = {
  h: utils.sha256(preImage),
  // ^^^^ important field (SENDER)
  preImage: '0x',
};

const correctPreImage: HashLockedSwapData = {
  preImage: preImage,
  // ^^^^ important field (RECEIVER)
  h: HashZero,
};

const incorrectPreImage: HashLockedSwapData = {
  preImage: '0xdeadc0de',
  // ^^^^ important field (RECEIVER)
  h: HashZero,
};

const msg0 = 'p2.amt: no sig';
const msg1 = 'Incorrect preimage';
describe('validTransition', () => {
  it.each`
    isValid  | signedBy | dataA                 | balancesA                                    | turnNumB | dataB                | balancesB                                    | description
    ${true}  | ${0b111} | ${conditionalPayment} | ${{Sender: 1, Receiver: 0, Intermediary: 5}} | ${4}     | ${correctPreImage}   | ${{Sender: 0, Receiver: 1, Intermediary: 5}} | ${'Unanimous signatures implies true'}
    ${true}  | ${0b111} | ${conditionalPayment} | ${{Sender: 1, Receiver: 0, Intermediary: 5}} | ${4}     | ${incorrectPreImage} | ${{Sender: 0, Receiver: 1, Intermediary: 5}} | ${'Unanimous signatures implies true'}
    ${false} | ${0b000} | ${conditionalPayment} | ${{Sender: 1, Receiver: 0, Intermediary: 5}} | ${4}     | ${incorrectPreImage} | ${{Sender: 0, Receiver: 1, Intermediary: 5}} | ${'no signatures implies false'}
    ${true}  | ${0b011} | ${conditionalPayment} | ${{Sender: 1, Receiver: 0, Intermediary: 5}} | ${4}     | ${correctPreImage}   | ${{Sender: 0, Receiver: 1, Intermediary: 5}} | ${'Receiver unlocks the conditional payment'}
    ${msg0}  | ${0b011} | ${conditionalPayment} | ${{Sender: 1, Receiver: 0, Intermediary: 5}} | ${4}     | ${correctPreImage}   | ${{Sender: 0, Receiver: 1, Intermediary: 2}} | ${'Receiver unlocks the conditional payment, but tries to grief the intermediary'}
    ${msg1}  | ${0b011} | ${conditionalPayment} | ${{Sender: 1, Receiver: 0, Intermediary: 5}} | ${4}     | ${incorrectPreImage} | ${{Sender: 0, Receiver: 1, Intermediary: 5}} | ${'Receiver cannot unlock with incorrect preimage'}
  `(
    '$description',
    async ({
      isValid,
      signedBy,
      dataA,
      balancesA,
      turnNumB,
      dataB,
      balancesB,
    }: {
      isValid;
      signedBy;
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
        appData: encodeTwoOfThreeData(dataA),
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
        appData: encodeTwoOfThreeData(dataB),
      };

      if (isValid == true) {
        const isValidFromCall = await twoOfThree.validTransition(
          variablePartA,
          variablePartB,
          turnNumB,
          numParticipants,
          signedBy
        );
        expect(isValidFromCall).toBe(true);
      } else if (typeof isValid == 'string') {
        await expectRevert(
          () =>
            twoOfThree.validTransition(
              variablePartA,
              variablePartB,
              turnNumB,
              numParticipants,
              signedBy
            ),
          isValid
        );
      } else if (isValid == false) {
        const isValidFromCall = await twoOfThree.validTransition(
          variablePartA,
          variablePartB,
          turnNumB,
          numParticipants,
          signedBy
        );
        expect(isValidFromCall).toBe(false);
      }
    }
  );
});
