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
    ${true}  | ${'RoundProposed'} | ${'RoundAccepted'} | ${[1,1}} | ${'Rock'} | ${'Rock'}     | ${[{A: 5, B: 5},{A: 5, B: 5}]} | ${[{A: 4, B: 6}} | ${''}
    ${true}  | ${'RoundAccepted'} | ${'Reveal'}        | ${[1,1}} | ${'Rock'} | ${'Paper'}    | ${[{A: 4, B: 6}} | ${[{A: 4, B: 6}} | ${'B won'}
    ${true}  | ${'RoundAccepted'} | ${'Reveal'}        | ${[1,1}} | ${'Rock'} | ${'Scissors'} | ${[{A: 4, B: 6}} | ${[{A: 6, B: 4}} | ${'A won'}
    ${true}  | ${'RoundAccepted'} | ${'Reveal'}        | ${[1,1}} | ${'Rock'} | ${'Rock'}     | ${[{A: 4, B: 6}} | ${[{A: 5, B: 5},{A: 5, B: 5}]} | ${'Draw'}
    ${true}  | ${'Reveal'}        | ${'Start'}         | ${[1,1}} | ${'Rock'} | ${'Rock'}     | ${[{A: 5, B: 5},{A: 5, B: 5}]} | ${[{A: 5, B: 5},{A: 5, B: 5}]} | ${''}
    ${false} | ${'Reveal'}        | ${'Start'}         | ${[1,2}} | ${'Rock'} | ${'Rock'}     | ${[{A: 5, B: 5},{A: 5, B: 5}]} | ${[{A: 5, B: 5},{A: 5, B: 5}]} | ${'Disallows stake change'}
    ${false} | ${'Start'}         | ${'RoundProposed'} | ${[1,1}} | ${'Rock'} | ${'Rock'}     | ${[{A: 5, B: 5},{A: 5, B: 5}]} | ${[{A: 6, B: 4}} | ${'Disallows allocations change '}
    ${false} | ${'RoundProposed'} | ${'RoundAccepted'} | ${[1,1}} | ${'Rock'} | ${'Rock'}     | ${[{A: 6, B: 4}} | ${{B: 6, A: 4}} | ${'Disallows destination swap'}
    ${false} | ${'Start'}         | ${'RoundProposed'} | ${[1,6}} | ${'Rock'} | ${'Rock'}     | ${[{A: 5, B: 5},{A: 5, B: 5}]} | ${[{A: 5, B: 5},{A: 5, B: 5}]} | ${'Disallows a stake that is too large'}
*/

const zero = 0b000000000;
const one = 0b000000001;
const two = 0b000000010;
const three = 0b000000011;
const five = 0b000000101;
const six = 0b000000110;
const seven = 0b000000111;

const balanceStart = [
  {A: 5, B: 5},
  {A: 5, B: 5}
];

const startToXPlaying = ['Start', 'XPlaying'];
const xPlayingToOPlaying = ['XPlaying', 'OPlaying'];
const oPlayingToXPlaying = ['OPlaying', 'XPlaying'];

describe('validTransition', () => {
  it.each`
    isValid  | positionType          | stake     | Xs               | Os              | balances        | description
    ${true}  | ${startToXPlaying}    | ${[1, 1]} | ${[zero, one]}   | ${[zero, zero]} | ${balanceStart} | ${'X can start a game'}
    ${false} | ${startToXPlaying}    | ${[1, 1]} | ${[zero, zero]}  | ${[zero, zero]} | ${balanceStart} | ${"X doesn't make a move"}
    ${false} | ${startToXPlaying}    | ${[1, 1]} | ${[zero, one]}   | ${[zero, two]}  | ${balanceStart} | ${'O changed during X move'}
    ${false} | ${startToXPlaying}    | ${[1, 1]} | ${[zero, three]} | ${[zero, zero]} | ${balanceStart} | ${'X starts with two marks'}
    ${true}  | ${xPlayingToOPlaying} | ${[1, 1]} | ${[one, one]}    | ${[zero, two]}  | ${balanceStart} | ${'O can make a move'}
    ${false} | ${xPlayingToOPlaying} | ${[1, 1]} | ${[zero, one]}   | ${[zero, two]}  | ${balanceStart} | ${'X changed during O move'}
    ${false} | ${xPlayingToOPlaying} | ${[1, 1]} | ${[one, one]}    | ${[zero, one]}  | ${balanceStart} | ${'O cant override a mark'}
    ${false} | ${xPlayingToOPlaying} | ${[1, 1]} | ${[one, one]}    | ${[zero, five]} | ${balanceStart} | ${'O cant make two marks'}
    ${true}  | ${oPlayingToXPlaying} | ${[1, 1]} | ${[one, five]}   | ${[two, two]}   | ${balanceStart} | ${'X can make a move'}
    ${false} | ${oPlayingToXPlaying} | ${[1, 1]} | ${[one, five]}   | ${[two, six]}   | ${balanceStart} | ${'O changed during X move'}
    ${false} | ${oPlayingToXPlaying} | ${[1, 1]} | ${[one, three]}  | ${[two, two]}   | ${balanceStart} | ${'X cant override a mark'}
    ${false} | ${oPlayingToXPlaying} | ${[1, 1]} | ${[one, seven]}  | ${[two, two]}   | ${balanceStart} | ${'X cant make two marks'}
  `(
    `Returns $isValid on $positionType; $description`,
    async ({
      isValid,
      positionType,
      stake,
      Xs,
      Os,
      balances
    }: {
      isValid: boolean;
      positionType: string[];
      stake: number[];
      Xs: number[];
      Os: number[];
      balances: AssetOutcomeShortHand[];
    }) => {
      const fromBalances = replaceAddressesAndBigNumberify(balances[0], addresses);
      const toBalances = replaceAddressesAndBigNumberify(balances[1], addresses);

      const fromPositionType = positionType[0];
      const toPositionType = positionType[1];

      const fromStake = stake[0];
      const toStake = stake[1];

      const fromXs = Xs[0];
      const toXs = Xs[1];

      const fromOs = Os[0];
      const toOs = Os[1];

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
        stake: bigNumberify(fromStake).toString(),
        Xs: fromXs,
        Os: fromOs
      };
      const toAppData: TTTData = {
        positionType: PositionIndex[toPositionType],
        stake: bigNumberify(toStake).toString(),
        Xs: toXs,
        Os: toOs
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
