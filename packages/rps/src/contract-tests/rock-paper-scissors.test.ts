import * as ethers from 'ethers';
// @ts-ignore
import RockPaperScissorsArtifact from '../../build/contracts/RockPaperScissors.json';
jest.setTimeout(20000);
import {expectRevert} from '@statechannels/devtools';
import path from 'path';
import {Contract} from 'ethers';
import {AddressZero} from 'ethers/constants';
import {
  Allocation,
  encodeOutcome,
  AssetOutcomeShortHand,
  replaceAddressesAndBigNumberify,
  randomExternalDestination,
} from '@statechannels/nitro-protocol';
import {VariablePart} from '@statechannels/nitro-protocol';
import {RPSData, PositionType, encodeAppData} from '../core/app-data';
import {Weapon} from '../core/weapons';

import loadJsonFile from 'load-json-file';

import {defaultAbiCoder, bigNumberify, keccak256} from 'ethers/utils';
import {randomHex} from '../utils/randomHex';

const testProvider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.GANACHE_PORT}`
);

const PositionIndex = {
  Start: PositionType.Start,
  RoundProposed: PositionType.RoundProposed,
  RoundAccepted: PositionType.RoundAccepted,
  Reveal: PositionType.Reveal,
};

const WeaponIndex = {
  Rock: Weapon.Rock,
  Paper: Weapon.Paper,
  Scissors: Weapon.Scissors,
};

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

const salt = randomHex(64);
const preCommit = hashPreCommit(Weapon.Rock, salt);
describe('validTransition', () => {
  it.each`
    isValid  | fromPositionType   | toPositionType     | stake               | AWeapon   | BWeapon       | fromBalances    | toBalances      | description
    ${true}  | ${'Start'}         | ${'RoundProposed'} | ${{from: 1, to: 1}} | ${'Rock'} | ${'Rock'}     | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${''}
    ${true}  | ${'RoundProposed'} | ${'RoundAccepted'} | ${{from: 1, to: 1}} | ${'Rock'} | ${'Rock'}     | ${{A: 5, B: 5}} | ${{A: 4, B: 6}} | ${''}
    ${true}  | ${'RoundAccepted'} | ${'Reveal'}        | ${{from: 1, to: 1}} | ${'Rock'} | ${'Paper'}    | ${{A: 4, B: 6}} | ${{A: 4, B: 6}} | ${'B won'}
    ${true}  | ${'RoundAccepted'} | ${'Reveal'}        | ${{from: 1, to: 1}} | ${'Rock'} | ${'Scissors'} | ${{A: 4, B: 6}} | ${{A: 6, B: 4}} | ${'A won'}
    ${true}  | ${'RoundAccepted'} | ${'Reveal'}        | ${{from: 1, to: 1}} | ${'Rock'} | ${'Rock'}     | ${{A: 4, B: 6}} | ${{A: 5, B: 5}} | ${'Draw'}
    ${true}  | ${'Reveal'}        | ${'Start'}         | ${{from: 1, to: 1}} | ${'Rock'} | ${'Rock'}     | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${''}
    ${false} | ${'Reveal'}        | ${'Start'}         | ${{from: 1, to: 2}} | ${'Rock'} | ${'Rock'}     | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'Disallows stake change'}
    ${false} | ${'Start'}         | ${'RoundProposed'} | ${{from: 1, to: 1}} | ${'Rock'} | ${'Rock'}     | ${{A: 5, B: 5}} | ${{A: 6, B: 4}} | ${'Disallows allocations change '}
    ${false} | ${'RoundProposed'} | ${'RoundAccepted'} | ${{from: 1, to: 1}} | ${'Rock'} | ${'Rock'}     | ${{A: 6, B: 4}} | ${{B: 6, A: 4}} | ${'Disallows destination swap'}
    ${false} | ${'Start'}         | ${'RoundProposed'} | ${{from: 1, to: 6}} | ${'Rock'} | ${'Rock'}     | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'Disallows a stake that is too large'}
  `(
    `Returns $isValid on $fromPositionType -> $toPositionType; $description`,
    async ({
      isValid,
      fromPositionType,
      toPositionType,
      stake,
      AWeapon,
      BWeapon,
      fromBalances,
      toBalances,
    }: {
      isValid: boolean;
      fromPositionType: string;
      toPositionType: string;
      stake;
      AWeapon: string;
      BWeapon: string;
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
        positionType: PositionIndex[fromPositionType],
        stake: bigNumberify(stake.from),
        preCommit,
        playerAWeapon: WeaponIndex[AWeapon],
        playerBWeapon: WeaponIndex[BWeapon],
        salt,
      };
      const toAppData: RPSData = {
        positionType: PositionIndex[toPositionType],
        stake: bigNumberify(stake.to),
        preCommit,
        playerAWeapon: WeaponIndex[AWeapon],
        playerBWeapon: WeaponIndex[BWeapon],
        salt,
      };

      const [fromAppDataBytes, toAppDataBytes] = [fromAppData, toAppData].map(encodeAppData);

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

export const getNetworkMap = async () => {
  try {
    return await loadJsonFile(path.join(__dirname, '../../deployment/network-map.json'));
  } catch (err) {
    if (!!err.message.match('ENOENT: no such file or directory')) {
      return {};
    } else {
      throw err;
    }
  }
};

export async function setupContracts(provider: ethers.providers.JsonRpcProvider, artifact) {
  const signer = provider.getSigner(0);
  const networkId = (await provider.getNetwork()).chainId;
  const networkMap = await getNetworkMap();

  const contractName = artifact.contractName;
  const contractAddress = networkMap ? networkMap[networkId][contractName] : undefined;
  const contract = new ethers.Contract(contractAddress, artifact.abi, signer);
  return contract;
}

export function hashPreCommit(weapon: Weapon, _salt: string) {
  return keccak256(defaultAbiCoder.encode(['uint256', 'bytes32'], [weapon, _salt]));
}
