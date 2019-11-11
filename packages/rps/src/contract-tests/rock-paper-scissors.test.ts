import * as ethers from 'ethers';
// @ts-ignore
import RockPaperScissorsArtifact from '../../build/contracts/RockPaperScissors.json';
jest.setTimeout(20000);
import {expectRevert} from '@statechannels/devtools';
import path from 'path';
import {Contract} from 'ethers';
import {AddressZero, HashZero} from 'ethers/constants';
import {
  Allocation,
  encodeOutcome,
  AssetOutcomeShortHand,
  replaceAddressesAndBigNumberify,
  randomExternalDestination,
} from '@statechannels/nitro-protocol';
import {VariablePart} from '@statechannels/nitro-protocol';

import loadJsonFile from 'load-json-file';

import {defaultAbiCoder, bigNumberify, BigNumber} from 'ethers/utils';

const testProvider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.GANACHE_PORT}`
);

enum PositionType {
  Start, // 0
  RoundProposed, // 1
  RoundAccepted, // 2
  Reveal, // 3
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
    isValid  | positionType                                                | stake               | AWeapon                       | BWeapon                       | fromBalances    | toBalances      | description
    ${true}  | ${[PositionType.Start, PositionType.RoundProposed]}         | ${{from: 1, to: 1}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${''}
    ${true}  | ${[PositionType.RoundProposed, PositionType.RoundAccepted]} | ${{from: 1, to: 1}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${''}
    ${true}  | ${[PositionType.RoundAccepted, PositionType.Reveal]}        | ${{from: 1, to: 1}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${''}
    ${true}  | ${[PositionType.Reveal, PositionType.Start]}                | ${{from: 1, to: 1}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${''}
    ${false} | ${[PositionType.Reveal, PositionType.Start]}                | ${{from: 1, to: 2}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'Disallows stake change'}
    ${false} | ${[PositionType.Start, PositionType.RoundProposed]}         | ${{from: 1, to: 1}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 5, B: 5}} | ${{A: 6, B: 4}} | ${'Disallows allocations change '}
    ${false} | ${[PositionType.RoundProposed, PositionType.RoundAccepted]} | ${{from: 1, to: 1}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 6, B: 4}} | ${{B: 6, A: 4}} | ${'Disallows destination swap'}
    ${false} | ${[PositionType.Start, PositionType.RoundProposed]}         | ${{from: 1, to: 6}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'Disallows a stake that is too large'}
  `(
    `Returns $isValid on [from, to] = PositionType$positionType ; $description`,
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
          toVariablePart,
          fromVariablePart,
          1, // unused
          numParticipants
        );
        expect(isValidFromCall).toBe(true);
      } else {
        await expectRevert(() =>
          RockPaperScissors.validTransition(
            toVariablePart,
            fromVariablePart,
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
