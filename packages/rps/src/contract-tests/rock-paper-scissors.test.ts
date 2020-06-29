import {expectRevert} from '@statechannels/devtools';
import RockPaperScissorsArtifact from '../../build/contracts/RockPaperScissors.json';
import {ethers, utils} from 'ethers';
import {defaultAbiCoder, bigNumberify, keccak256, Interface, BigNumberish} from 'ethers/utils';
import dotEnvExtended from 'dotenv-extended';
import path from 'path';
import {AddressZero} from 'ethers/constants';
import {Allocation, encodeOutcome} from '@statechannels/nitro-protocol';
import {VariablePart} from '@statechannels/nitro-protocol';
import {RPSData, PositionType, encodeRPSData} from '../core/app-data';
import {Weapon} from '../core/weapons';
import loadJsonFile from 'load-json-file';

import {randomHex} from '../utils/randomHex';
import fs from 'fs';

dotEnvExtended.load();

jest.setTimeout(20000);

export interface AssetOutcomeShortHand {
  [destination: string]: utils.BigNumberish;
}

// E.g. {ETH: {ALICE:2, BOB:3}, DAI: {ALICE:1, BOB:4}}
export interface OutcomeShortHand {
  [assetHolder: string]: AssetOutcomeShortHand;
}

export interface AddressesLookup {
  [shorthand: string]: string | undefined;
}

// Recursively replaces any key with the value of that key in the addresses object
// BigNumberify all numbers
export function replaceAddressesAndBigNumberify(
  object: AssetOutcomeShortHand | OutcomeShortHand | string,
  addresses: AddressesLookup
): AssetOutcomeShortHand | OutcomeShortHand | string {
  const newObject = {};
  Object.keys(object).forEach(key => {
    if (
      typeof object === 'object' &&
      typeof addresses === 'object' &&
      typeof object[key] === 'object'
    ) {
      // Recurse
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      newObject[addresses[key]] = replaceAddressesAndBigNumberify(object[key], addresses);
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    if (typeof object[key] === 'number') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      newObject[addresses[key]] = utils.bigNumberify(object[key]);
    }
  });
  return newObject;
}

export const randomExternalDestination = (): string =>
  '0x' +
  ethers.Wallet.createRandom()
    .address.slice(2, 42)
    .padStart(64, '0')
    .toLowerCase();

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

let RockPaperScissors: ethers.Contract;

const numParticipants = 3;
const addresses = {
  // participants
  A: randomExternalDestination(),
  B: randomExternalDestination(),
};

beforeAll(async () => {
  RockPaperScissors = await setupContracts(
    testProvider,
    RockPaperScissorsArtifact,
    process.env.RPS_CONTRACT_ADDRESS
  );
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
    ${false} | ${'Start'}         | ${'RoundProposed'} | ${{from: 1, to: 6}} | ${'Rock'} | ${'Rock'}     | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'Disallows a stake that changes'}
    ${false} | ${'RoundAccepted'} | ${'Reveal'}        | ${{from: 1, to: 2}} | ${'Rock'} | ${'Scissors'} | ${{A: 4, B: 6}} | ${{A: 8, B: 4}} | ${'Disallows a stake that changes'}
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
      description,
    }: {
      isValid: boolean;
      fromPositionType: string;
      toPositionType: string;
      stake;
      AWeapon: string;
      BWeapon: string;
      fromBalances: AssetOutcomeShortHand;
      toBalances: AssetOutcomeShortHand;
      description: string;
    }) => {
      fromBalances = replaceAddressesAndBigNumberify(
        fromBalances,
        addresses
      ) as AssetOutcomeShortHand;
      toBalances = replaceAddressesAndBigNumberify(toBalances, addresses) as AssetOutcomeShortHand;

      const fromAllocation: Allocation = [];
      const toAllocation: Allocation = [];

      Object.keys(fromBalances).forEach(key =>
        fromAllocation.push({destination: key, amount: fromBalances[key] as string})
      );
      Object.keys(toBalances).forEach(key =>
        toAllocation.push({destination: key, amount: toBalances[key] as string})
      );

      const fromOutcome = [{assetHolderAddress: AddressZero, allocationItems: fromAllocation}];
      const toOutcome = [{assetHolderAddress: AddressZero, allocationItems: toAllocation}];

      const fromAppData: RPSData = {
        positionType: PositionIndex[fromPositionType],
        stake: bigNumberify(stake.from).toString(),
        preCommit,
        playerAWeapon: WeaponIndex[AWeapon],
        playerBWeapon: WeaponIndex[BWeapon],
        salt,
      };
      const toAppData: RPSData = {
        positionType: PositionIndex[toPositionType],
        stake: bigNumberify(stake.to).toString(),
        preCommit,
        playerAWeapon: WeaponIndex[AWeapon],
        playerBWeapon: WeaponIndex[BWeapon],
        salt,
      };

      const [fromAppDataBytes, toAppDataBytes] = [fromAppData, toAppData].map(encodeRPSData);

      const fromVariablePart: VariablePart = {
        outcome: encodeOutcome(fromOutcome),
        appData: fromAppDataBytes,
      };
      const toVariablePart: VariablePart = {
        outcome: encodeOutcome(toOutcome),
        appData: toAppDataBytes,
      };

      if (isValid) {
        const RockPaperScissorsContractInterface = new Interface(RockPaperScissorsArtifact.abi);
        const data = RockPaperScissorsContractInterface.functions.validTransition.encode([
          fromVariablePart,
          toVariablePart,
          1,
          numParticipants,
        ]);
        const signer = testProvider.getSigner();
        const transaction = {data, gasLimit: 3000000};
        const response = await signer.sendTransaction({
          to: RockPaperScissors.address,
          ...transaction,
        });

        const descriptor = `Returns ${isValid} on ${fromPositionType} -> ${toPositionType}; ${description}`;
        const receipt = await (await response).wait();
        await writeGasConsumption('./RockPaperScissors.gas.md', descriptor, receipt.gasUsed);

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

export async function setupContracts(
  provider: ethers.providers.JsonRpcProvider,
  artifact,
  address
) {
  const signer = provider.getSigner(0);

  const contract = new ethers.Contract(address, artifact.abi, signer);
  return contract;
}

export function hashPreCommit(weapon: Weapon, salt: string) {
  return keccak256(defaultAbiCoder.encode(['uint256', 'bytes32'], [weapon, salt]));
}

export async function writeGasConsumption(
  filename: string,
  description: string,
  gas: BigNumberish
): Promise<void> {
  await fs.appendFile(filename, description + ':\n' + gas.toString() + ' gas\n\n', err => {
    if (err) throw err;
    console.log('Wrote gas info to ' + filename);
  });
}
