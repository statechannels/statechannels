import {expectRevert} from '@statechannels/devtools';
import TicTacToeArtifact from '../../build/contracts/TicTacToe.json';
import * as ethers from 'ethers';
import {Contract} from 'ethers';
import {bigNumberify, Interface} from 'ethers/utils';
import dotEnvExtended from 'dotenv-extended';
import path from 'path';
import {AddressZero} from 'ethers/constants';
import {TransactionRequest} from 'ethers/providers';
import {
  Allocation,
  encodeOutcome,
  AssetOutcomeShortHand,
  replaceAddressesAndBigNumberify,
  randomExternalDestination
} from '@statechannels/nitro-protocol';
import {VariablePart} from '@statechannels/nitro-protocol';
import {TTTData, PositionType, encodeTTTData} from './types/app-data';

import loadJsonFile from 'load-json-file';
import {JsonValue} from 'type-fest';

dotEnvExtended.load();

jest.setTimeout(20000);

const testProvider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.GANACHE_PORT}`
);

const PositionIndex = {
  Start: PositionType.Start,
  XPlaying: PositionType.XPlaying,
  OPlaying: PositionType.OPlaying,
  Draw: PositionType.Draw,
  Victory: PositionType.Victory
};

let TicTacToe: Contract;

const numParticipants = 2;
const addresses = {
  // participants
  A: randomExternalDestination(),
  B: randomExternalDestination()
};

export function setupContracts(
  provider: ethers.providers.JsonRpcProvider,
  artifact,
  address
): ethers.ethers.Contract {
  const signer = provider.getSigner(0);

  const contract = new ethers.Contract(address, artifact.abi, signer);
  return contract;
}

async function sendTransaction(
  contractAddress: string,
  transaction: TransactionRequest
): Promise<void> {
  // move to devtools
  const signer = testProvider.getSigner();
  const response = await signer.sendTransaction({to: contractAddress, ...transaction});
  await response.wait();
}

beforeAll(async () => {
  TicTacToe = await setupContracts(
    testProvider,
    TicTacToeArtifact,
    process.env.TTT_CONTRACT_ADDRESS
  );
});

/* 
    ${true}  | ${'RoundProposed'} | ${'RoundAccepted'} | ${{from: 1, to: 1}} | ${'Rock'} | ${'Rock'}     | ${{A: 5, B: 5}} | ${{A: 4, B: 6}} | ${''}
    ${true}  | ${'RoundAccepted'} | ${'Reveal'}        | ${{from: 1, to: 1}} | ${'Rock'} | ${'Paper'}    | ${{A: 4, B: 6}} | ${{A: 4, B: 6}} | ${'B won'}
    ${true}  | ${'RoundAccepted'} | ${'Reveal'}        | ${{from: 1, to: 1}} | ${'Rock'} | ${'Scissors'} | ${{A: 4, B: 6}} | ${{A: 6, B: 4}} | ${'A won'}
    ${true}  | ${'RoundAccepted'} | ${'Reveal'}        | ${{from: 1, to: 1}} | ${'Rock'} | ${'Rock'}     | ${{A: 4, B: 6}} | ${{A: 5, B: 5}} | ${'Draw'}
    ${true}  | ${'Reveal'}        | ${'Start'}         | ${{from: 1, to: 1}} | ${'Rock'} | ${'Rock'}     | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${''}
    ${false} | ${'Reveal'}        | ${'Start'}         | ${{from: 1, to: 2}} | ${'Rock'} | ${'Rock'}     | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'Disallows stake change'}
    ${false} | ${'Start'}         | ${'RoundProposed'} | ${{from: 1, to: 1}} | ${'Rock'} | ${'Rock'}     | ${{A: 5, B: 5}} | ${{A: 6, B: 4}} | ${'Disallows allocations change '}
    ${false} | ${'RoundProposed'} | ${'RoundAccepted'} | ${{from: 1, to: 1}} | ${'Rock'} | ${'Rock'}     | ${{A: 6, B: 4}} | ${{B: 6, A: 4}} | ${'Disallows destination swap'}
    ${false} | ${'Start'}         | ${'RoundProposed'} | ${{from: 1, to: 6}} | ${'Rock'} | ${'Rock'}     | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'Disallows a stake that is too large'}
*/
describe('validTransition', () => {
  it.each`
    isValid  | fromPositionType | toPositionType | stake               | Xs             | Os             | fromBalances    | toBalances      | description
    ${true}  | ${'Start'}       | ${'XPlaying'}  | ${{from: 1, to: 1}} | ${0b000000001} | ${0}           | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${''}
    ${false} | ${'Start'}       | ${'XPlaying'}  | ${{from: 1, to: 1}} | ${0b000000000} | ${0}           | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${"X doesn't make a move"}
    ${false} | ${'Start'}       | ${'XPlaying'}  | ${{from: 1, to: 1}} | ${0b000000001} | ${0b000000010} | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'X changes Os'}
  `(
    `Returns $isValid on $fromPositionType -> $toPositionType; $description`,
    async ({
      isValid,
      fromPositionType,
      toPositionType,
      stake,
      Xs,
      Os,
      fromBalances,
      toBalances
    }: {
      isValid: boolean;
      fromPositionType: string;
      toPositionType: string;
      stake;
      Xs: number;
      Os: number;
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

      const fromAppData: TTTData = {
        positionType: PositionIndex[fromPositionType],
        stake: bigNumberify(stake.from).toString(),
        Xs,
        Os
      };
      const toAppData: TTTData = {
        positionType: PositionIndex[toPositionType],
        stake: bigNumberify(stake.to).toString(),
        Xs,
        Os
      };

      const [fromAppDataBytes, toAppDataBytes] = [fromAppData, toAppData].map(encodeTTTData);

      const fromVariablePart: VariablePart = {
        outcome: encodeOutcome(fromOutcome),
        appData: fromAppDataBytes
      };
      const toVariablePart: VariablePart = {
        outcome: encodeOutcome(toOutcome),
        appData: toAppDataBytes
      };

      if (isValid) {
        const TicTacToeContractInterface = new Interface(TicTacToeArtifact.abi);
        const data = TicTacToeContractInterface.functions.validTransition.encode([
          fromVariablePart,
          toVariablePart,
          1,
          numParticipants
        ]);

        await sendTransaction(TicTacToe.address, {data, gasLimit: 3000000});

        const isValidFromCall = await TicTacToe.validTransition(
          fromVariablePart,
          toVariablePart,
          1, // unused
          numParticipants
        );
        expect(isValidFromCall).toBe(true);
      } else {
        await expectRevert(() =>
          TicTacToe.validTransition(
            fromVariablePart,
            toVariablePart,
            1, // unused
            numParticipants
          )
        );
      }
      return isValid || fromVariablePart || toVariablePart;
    }
  );
});

export const getNetworkMap = async (): Promise<JsonValue> => {
  try {
    return await loadJsonFile(path.join(__dirname, '../../deployment/network-map.json'));
  } catch (err) {
    if (err.message.match('ENOENT: no such file or directory')) {
      return {};
    } else {
      throw err;
    }
  }
};
