import {ethers} from 'ethers';
// @ts-ignore
import SingleAssetPaymentsArtifact from '../../../../build/contracts/SingleAssetPayments.json';
import {setupContracts, replaceAddresses} from '../../../test-helpers';
import {expectRevert} from 'magmo-devtools';
import {Allocation, encodeOutcome} from '../../../../src/contract/outcome';
import {AddressZero, HashZero} from 'ethers/constants';
import {VariablePart} from '../../../../src/contract/state.js';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let singleAssetPayments: ethers.Contract;

const numParticipants = 3;
const addresses = {
  // participants
  A: ethers.Wallet.createRandom().address.padEnd(66, '0'),
  B: ethers.Wallet.createRandom().address.padEnd(66, '0'),
  C: ethers.Wallet.createRandom().address.padEnd(66, '0'),
};
const guarantee = {
  targetChannelId: HashZero,
  destinations: [addresses.A],
};

beforeAll(async () => {
  singleAssetPayments = await setupContracts(provider, SingleAssetPaymentsArtifact);
});

describe('validTransition', () => {
  it.each`
    isValid  | numAssets | isAllocation      | balancesA             | turnNumB | balancesB             | description
    ${true}  | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${3}     | ${{A: 0, B: 2, C: 1}} | ${'A pays B 1 wei'}
    ${true}  | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${4}     | ${{A: 1, B: 0, C: 2}} | ${'B pays C 1 wei'}
    ${true}  | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${5}     | ${{A: 1, B: 2, C: 0}} | ${'C pays B 1 wei'}
    ${false} | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${5}     | ${{A: 0, B: 2, C: 1}} | ${'A pays B 1 wei (not their move)'}
    ${false} | ${[1, 1]} | ${[false, false]} | ${{A: 1, B: 1, C: 1}} | ${3}     | ${{A: 1, B: 2, C: 1}} | ${'Guarantee'}
    ${false} | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${3}     | ${{A: 1, B: 2, C: 1}} | ${'Total amounts increase'}
    ${false} | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${3}     | ${{A: 2, B: 0, C: 1}} | ${'A pays themself 1 wei'}
    ${false} | ${[2, 2]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${3}     | ${{A: 2, B: 0, C: 1}} | ${'More than one asset'}
  `(
    '$description',
    async ({
      isValid,
      isAllocation,
      numAssets,
      balancesA,
      turnNumB,
      balancesB,
    }: {
      isValid: boolean;
      isAllocation: boolean[];
      numAssets: number[];
      balancesA: any;
      turnNumB: number;
      balancesB: any;
    }) => {
      balancesA = replaceAddresses(balancesA, addresses);
      const allocationA: Allocation = [];
      Object.keys(balancesA).forEach(key =>
        allocationA.push({destination: key, amount: balancesA[key]}),
      );
      let outcomeA;
      if (isAllocation[0]) {
        outcomeA = [{assetHolderAddress: AddressZero, allocation: allocationA}];
      } else {
        outcomeA = [
          {
            assetHolderAddress: AddressZero,
            guarantee,
          },
        ];
      }

      if (numAssets[0] === 2) {
        outcomeA.push(outcomeA[0]);
      }
      const variablePartA: VariablePart = {
        outcome: encodeOutcome(outcomeA),
        appData: HashZero,
      };

      balancesB = replaceAddresses(balancesB, addresses);
      const allocationB: Allocation = [];

      Object.keys(balancesB).forEach(key =>
        allocationB.push({destination: key, amount: balancesB[key]}),
      );

      let outcomeB;
      if (isAllocation[1]) {
        outcomeB = [{assetHolderAddress: AddressZero, allocation: allocationB}];
      } else {
        outcomeB = [{assetHolderAddress: AddressZero, guarantee}];
      }
      if (numAssets[1] === 2) {
        outcomeB.push(outcomeB[0]);
      }
      const variablePartB: VariablePart = {
        outcome: encodeOutcome(outcomeB),
        appData: HashZero,
      };

      if (isValid) {
        const isValidFromCall = await singleAssetPayments.validTransition(
          variablePartA,
          variablePartB,
          turnNumB,
          numParticipants,
        );
        expect(isValidFromCall).toBe(true);
      } else {
        await expectRevert(() =>
          singleAssetPayments.validTransition(
            variablePartA,
            variablePartB,
            turnNumB,
            numParticipants,
          ),
        );
      }
    },
  );
});
