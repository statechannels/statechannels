import {expectRevert} from '@statechannels/devtools';
import TicTacToeArtifact from '../../build/contracts/TicTacToe.json';
import * as ethers from 'ethers';
import {Contract} from 'ethers';
import {bigNumberify, Interface} from 'ethers/utils';
import dotEnvExtended from 'dotenv-extended';
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

// Shows the binary representation of each cell on the board
//      0  |  1  |  2
//   +-----------------+
//      3  |  4  |  5
//   +-----------------+
//      6  |  7  |  8

// Shows the path of an example game that ends in a draw
// Each cell shows the Player and the turn that was taken
// This is used for the `draw` states below
//      X0  |  O5  |  X4
//   +-----------------+
//      X2  |  O1  |  O7
//   +-----------------+
//      O3  |  X6  |  X8

const drawX = 0b101100011;
const drawO = 0b010011100;

// Binary representations of numbers
const b = {
  0: 0b000000000,
  1: 0b000000001,
  2: 0b000000010,
  3: 0b000000011,
  5: 0b000000101,
  6: 0b000000110,
  7: 0b000000111,
  8: 0b000001011,
  11: 0b000001011,
  24: 0b000011000,
  156: drawO,
  354: 0b101100010,
  355: drawX
};

const balanceStartToAWins = [
  {A: 5, B: 5},
  {A: 6, B: 4}
];

const balanceBWinsToAWins = [
  {A: 4, B: 6},
  {A: 6, B: 4}
];

const balanceAWinsToBWins = [
  {A: 6, B: 4},
  {A: 4, B: 6}
];

const balanceBWinsToDraw = [
  {A: 4, B: 6},
  {A: 5, B: 5}
];

const balanceDrawToStart = [
  {A: 5, B: 5},
  {A: 5, B: 5}
];

const balanceAWinsToStart = [
  {A: 6, B: 4},
  {A: 6, B: 4}
];

const balanceBWinsToStart = [
  {A: 4, B: 6},
  {A: 4, B: 6}
];

const startToXPlaying = ['Start', 'XPlaying'];
const xPlayingToOPlaying = ['XPlaying', 'OPlaying'];
const oPlayingToXPlaying = ['OPlaying', 'XPlaying'];
const xPlayingToVictory = ['XPlaying', 'Victory'];
const oPlayingToVictory = ['OPlaying', 'Victory'];
const oPlayingToDraw = ['OPlaying', 'Draw'];
const drawToStart = ['Draw', 'Start'];
const victoryToStart = ['Victory', 'Start'];

describe('validTransition', () => {
  it.each`
    isValid  | positionType          | stake     | Xs                  | Os                  | balances               | description
    ${true}  | ${startToXPlaying}    | ${[1, 1]} | ${[b[0], b[1]]}     | ${[b[0], b[0]]}     | ${balanceStartToAWins} | ${'X can start a game'}
    ${true}  | ${xPlayingToOPlaying} | ${[1, 1]} | ${[b[1], b[1]]}     | ${[b[0], b[2]]}     | ${balanceAWinsToBWins} | ${'O can make a move'}
    ${true}  | ${oPlayingToXPlaying} | ${[1, 1]} | ${[b[1], b[5]]}     | ${[b[2], b[2]]}     | ${balanceBWinsToAWins} | ${'X can make a move'}
    ${true}  | ${oPlayingToVictory}  | ${[1, 1]} | ${[b[3], b[7]]}     | ${[b[24], b[24]]}   | ${balanceBWinsToAWins} | ${'X can win'}
    ${true}  | ${xPlayingToVictory}  | ${[1, 1]} | ${[b[24], b[24]]}   | ${[b[3], b[7]]}     | ${balanceAWinsToBWins} | ${'O can win'}
    ${true}  | ${oPlayingToDraw}     | ${[1, 1]} | ${[b[354], b[355]]} | ${[b[156], b[156]]} | ${balanceBWinsToDraw}  | ${'X can draw'}
    ${true}  | ${drawToStart}        | ${[1, 1]} | ${[b[0], b[0]]}     | ${[b[0], b[0]]}     | ${balanceDrawToStart}  | ${'Draw can restart'}
    ${true}  | ${victoryToStart}     | ${[1, 1]} | ${[b[0], b[0]]}     | ${[b[0], b[0]]}     | ${balanceAWinsToStart} | ${'X Victory can restart'}
    ${true}  | ${victoryToStart}     | ${[1, 1]} | ${[b[0], b[0]]}     | ${[b[0], b[0]]}     | ${balanceBWinsToStart} | ${'O Victory can restart'}
    ${false} | ${startToXPlaying}    | ${[1, 1]} | ${[b[0], b[0]]}     | ${[b[0], b[0]]}     | ${balanceStartToAWins} | ${`X doesn't make a move`}
    ${false} | ${startToXPlaying}    | ${[1, 2]} | ${[b[0], b[0]]}     | ${[b[0], b[0]]}     | ${balanceStartToAWins} | ${`Stake can't change`}
    ${false} | ${startToXPlaying}    | ${[1, 1]} | ${[b[0], b[1]]}     | ${[b[0], b[2]]}     | ${balanceStartToAWins} | ${'O changed during X move'}
    ${false} | ${startToXPlaying}    | ${[1, 1]} | ${[b[0], b[3]]}     | ${[b[0], b[0]]}     | ${balanceStartToAWins} | ${`X can't start with 2 marks`}
    ${false} | ${xPlayingToOPlaying} | ${[1, 1]} | ${[b[1], b[1]]}     | ${[b[0], b[0]]}     | ${balanceAWinsToBWins} | ${`O doesn't move`}
    ${false} | ${xPlayingToOPlaying} | ${[1, 1]} | ${[b[0], b[1]]}     | ${[b[0], b[2]]}     | ${balanceAWinsToBWins} | ${'X changed during O move'}
    ${false} | ${xPlayingToOPlaying} | ${[1, 1]} | ${[b[1], b[1]]}     | ${[b[0], b[1]]}     | ${balanceAWinsToBWins} | ${`O can't override a mark`}
    ${false} | ${xPlayingToOPlaying} | ${[1, 1]} | ${[b[1], b[1]]}     | ${[b[0], b[5]]}     | ${balanceAWinsToBWins} | ${`O can't make 2 marks`}
    ${false} | ${oPlayingToXPlaying} | ${[1, 1]} | ${[b[1], b[1]]}     | ${[b[2], b[2]]}     | ${balanceBWinsToAWins} | ${`X doesn't move`}
    ${false} | ${oPlayingToXPlaying} | ${[1, 1]} | ${[b[1], b[5]]}     | ${[b[2], b[6]]}     | ${balanceBWinsToAWins} | ${'O changed during X move'}
    ${false} | ${oPlayingToXPlaying} | ${[1, 1]} | ${[b[1], b[3]]}     | ${[b[2], b[2]]}     | ${balanceBWinsToAWins} | ${`X can't override a mark`}
    ${false} | ${oPlayingToXPlaying} | ${[1, 1]} | ${[b[1], b[11]]}    | ${[b[2], b[2]]}     | ${balanceBWinsToAWins} | ${`X can't make 2 marks`}
    ${false} | ${drawToStart}        | ${[1, 1]} | ${[b[354], b[355]]} | ${[b[156], b[156]]} | ${balanceDrawToStart}  | ${`Draw can't restart with marks`}
    ${false} | ${victoryToStart}     | ${[1, 1]} | ${[b[354], b[355]]} | ${[b[156], b[156]]} | ${balanceAWinsToStart} | ${`X Victory cant restart with marks`}
    ${false} | ${victoryToStart}     | ${[1, 1]} | ${[b[354], b[355]]} | ${[b[156], b[156]]} | ${balanceBWinsToStart} | ${'O Victory cant restart with marks'}
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
