import {expectRevert} from '@statechannels/devtools';
import {Allocation, AllocationType} from '@statechannels/exit-format';
import {Contract, ethers} from 'ethers';

const {HashZero} = ethers.constants;
import SingleAssetPaymentsArtifact from '../../../../artifacts/contracts/examples/SingleAssetPayments.sol/SingleAssetPayments.json';
import {encodeGuaranteeData, encodeOutcome, Outcome} from '../../../../src/contract/outcome';
import {VariablePart} from '../../../../src/contract/state';
import {
  getTestProvider,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContract,
} from '../../../test-helpers';

const provider = getTestProvider();
let singleAssetPayments: Contract;

const numParticipants = 3;
const addresses = {
  // Participants
  A: randomExternalDestination(),
  B: randomExternalDestination(),
  C: randomExternalDestination(),
};
const guaranteeDestinations = [addresses.A];

beforeAll(async () => {
  singleAssetPayments = setupContract(
    provider,
    SingleAssetPaymentsArtifact,
    process.env.SINGLE_ASSET_PAYMENT_ADDRESS
  );
});

const reason1 = 'Nonmover balance decreased';
const reason2 = 'not a simple allocation';
const reason3 = 'Total allocated cannot change';

describe('validTransition', () => {
  it.each`
    isValid  | numAssets | isAllocation      | balancesA             | turnNumB | balancesB             | reason       | description
    ${true}  | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${3}     | ${{A: 0, B: 2, C: 1}} | ${undefined} | ${'A pays B 1 wei'}
    ${true}  | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${4}     | ${{A: 1, B: 0, C: 2}} | ${undefined} | ${'B pays C 1 wei'}
    ${true}  | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${5}     | ${{A: 1, B: 2, C: 0}} | ${undefined} | ${'C pays B 1 wei'}
    ${false} | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${5}     | ${{A: 0, B: 2, C: 1}} | ${reason1}   | ${'A pays B 1 wei (not their move)'}
    ${false} | ${[1, 1]} | ${[false, false]} | ${{A: 1, B: 1, C: 1}} | ${3}     | ${{A: 0, B: 2, C: 1}} | ${reason2}   | ${'Guarantee'}
    ${false} | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${3}     | ${{A: 1, B: 2, C: 1}} | ${reason3}   | ${'Total amounts increase'}
    ${false} | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${3}     | ${{A: 2, B: 0, C: 1}} | ${undefined} | ${'A pays themself 1 wei'}
    ${false} | ${[2, 2]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${3}     | ${{A: 2, B: 0, C: 1}} | ${undefined} | ${'More than one asset'}
  `(
    '$description',
    async ({
      isValid,
      isAllocation,
      numAssets,
      balancesA,
      turnNumB,
      balancesB,
      reason,
    }: {
      isValid: boolean;
      isAllocation: boolean[];
      numAssets: number[];
      balancesA: any;
      turnNumB: number;
      balancesB: any;
      reason?: string;
    }) => {
      balancesA = replaceAddressesAndBigNumberify(balancesA, addresses);
      const allocationsA: Allocation[] = [];
      Object.keys(balancesA).forEach(key =>
        allocationsA.push({
          destination: key,
          amount: balancesA[key],
          allocationType: isAllocation[0] ? AllocationType.simple : AllocationType.guarantee,
          metadata: isAllocation[0] ? '0x' : encodeGuaranteeData(guaranteeDestinations),
        })
      );
      const outcomeA: Outcome = [
        {asset: ethers.constants.AddressZero, allocations: allocationsA, metadata: '0x'},
      ];

      if (numAssets[0] === 2) {
        outcomeA.push(outcomeA[0]);
      }
      const variablePartA: VariablePart = {
        outcome: encodeOutcome(outcomeA),
        appData: HashZero,
      };

      balancesB = replaceAddressesAndBigNumberify(balancesB, addresses);
      const allocationsB: Allocation[] = [];

      Object.keys(balancesB).forEach(key =>
        allocationsB.push({
          destination: key,
          amount: balancesB[key],
          allocationType: isAllocation[1] ? AllocationType.simple : AllocationType.guarantee,
          metadata: isAllocation[1] ? '0x' : encodeGuaranteeData(guaranteeDestinations),
        })
      );

      const outcomeB: Outcome = [
        {asset: ethers.constants.AddressZero, allocations: allocationsB, metadata: '0x'},
      ];

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
          numParticipants
        );
        expect(isValidFromCall).toBe(true);
      } else {
        await expectRevert(
          () =>
            singleAssetPayments.validTransition(
              variablePartA,
              variablePartB,
              turnNumB,
              numParticipants
            ),
          reason
        );
      }
    }
  );
});
