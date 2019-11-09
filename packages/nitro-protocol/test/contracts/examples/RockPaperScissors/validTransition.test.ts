// @ts-ignore
import {expectRevert} from '@statechannels/devtools';
import {Contract} from 'ethers';
import {AddressZero, HashZero} from 'ethers/constants';
import {BigNumber, bigNumberify, defaultAbiCoder} from 'ethers/utils';

import RockPaperScissorsArtifact from '../../../../build/contracts/RockPaperScissors.json';
import {Allocation, encodeOutcome} from '../../../../src/contract/outcome';
import {AssetOutcomeShortHand} from '../../../test-helpers';

import {VariablePart} from '../../../../src/contract/state.js';
import {
  getTestProvider,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContracts,
} from '../../../test-helpers';

enum PositionType {
  Start,
  RoundProposed,
  RoundAccepted,
  Reveal,
}

enum Weapon {
  Rock,
  Paper,
  Scissors,
}
interface RPSData {
  positionType: PositionType;
  stake: BigNumber; // uint256
  preCommit: string; // bytes32
  playerAWeapon: Weapon;
  playerBWeapon: Weapon;
  salt: string; // bytes32
}

const testProvider = getTestProvider();

let RockPaperScissors: Contract;

const numParticipants = 3;
const addresses = {
  // participants
  A: randomExternalDestination(),
  B: randomExternalDestination(),
};

beforeAll(async () => {
  RockPaperScissors = await setupContracts(testProvider, RockPaperScissorsArtifact);
});

describe('validTransition', () => {
  it.each`
    isValid | positionType                                        | stake               | AWeapon                       | BWeapon                       | fromBalances    | toBalances      | description
    ${true} | ${[PositionType.Start, PositionType.RoundProposed]} | ${{from: 1, to: 1}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'validTransition'}
  `(
    '$description',
    async ({
      isValid,
      positionType,
      stake,
      AWeapon,
      BWeapon,
      fromBalances,
      toBalances,
    }: {
      isValid: boolean;
      positionType: PositionType[];
      stake;
      AWeapon: Weapon[];
      BWeapon: Weapon[];
      fromBalances: AssetOutcomeShortHand;
      toBalances: AssetOutcomeShortHand;
    }) => {
      fromBalances = replaceAddressesAndBigNumberify(fromBalances, addresses);
      toBalances = replaceAddressesAndBigNumberify(toBalances, addresses);

      const fromAllocation: Allocation = [];
      const toAllocation: Allocation = [];

      Object.keys(fromBalances).forEach(key =>
        fromAllocation.push({destination: key, amount: fromBalances[key] as string})
      );
      Object.keys(toBalances).forEach(key =>
        toAllocation.push({destination: key, amount: toBalances[key] as string})
      );

      const fromOutcome = [{assetHolderAddress: AddressZero, allocation: fromAllocation}];
      const toOutcome = [{assetHolderAddress: AddressZero, allocation: toAllocation}];

      const fromAppData: RPSData = {
        positionType: positionType[0],
        stake: bigNumberify(stake.from),
        preCommit: HashZero,
        playerAWeapon: AWeapon[0],
        playerBWeapon: BWeapon[0],
        salt: HashZero,
      };
      const toAppData: RPSData = {
        positionType: positionType[1],
        stake: bigNumberify(stake.to),
        preCommit: HashZero,
        playerAWeapon: AWeapon[1],
        playerBWeapon: BWeapon[1],
        salt: HashZero,
      };

      const fromAppDataBytes = defaultAbiCoder.encode(
        [
          'tuple(uint8 positionType, uint256 stake, bytes32 preCommit, uint8 playerAWeapon, uint8 playerBWeapon, bytes32 salt)',
        ],
        [fromAppData]
      );
      const toAppDataBytes = defaultAbiCoder.encode(
        [
          'tuple(uint8 positionType, uint256 stake, bytes32 preCommit, uint8 playerAWeapon, uint8 playerBWeapon, bytes32 salt)',
        ],
        [toAppData]
      );

      const fromVariablePart: VariablePart = {
        outcome: encodeOutcome(fromOutcome),
        appData: fromAppDataBytes,
      };
      const toVariablePart: VariablePart = {
        outcome: encodeOutcome(toOutcome),
        appData: toAppDataBytes,
      };

      if (isValid) {
        const isValidFromCall = await RockPaperScissors.validTransition(
          fromVariablePart,
          toVariablePart,
          1, // unused
          numParticipants
        );
        expect(isValidFromCall).toBe(true);
      } else {
        await expectRevert(() =>
          RockPaperScissors.validTransition(
            fromVariablePart,
            toVariablePart,
            1, // unused
            numParticipants
          )
        );
      }
    }
  );
});
