declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethers: any;
  }
}

import {expectRevert, DeployedArtifact} from '@statechannels/devtools';
import TicTacToeArtifact from '../../build/contracts/TicTacToe.json';
import {ethers, Contract, utils} from 'ethers';
import {bigNumberify, Interface} from 'ethers/utils';
import dotEnvExtended from 'dotenv-extended';
import {AddressZero} from 'ethers/constants';
import {TransactionRequest} from 'ethers/providers';
import {Allocation, encodeOutcome} from '@statechannels/nitro-protocol';
import {VariablePart} from '@statechannels/nitro-protocol';

window.ethers = ethers; // Needed because core/app-data uses global ethers
import {TTTData, PositionType, encodeTTTData} from '../../app/core/app-data';

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

let TicTacToe: Contract;

const numParticipants = 2;
const addresses = {
  // participants
  A: randomExternalDestination(),
  B: randomExternalDestination()
};

export function setupContracts(
  provider: ethers.providers.JsonRpcProvider,
  artifact: DeployedArtifact,
  address: string
): ethers.Contract {
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
    (TicTacToeArtifact as unknown) as DeployedArtifact,
    process.env.TTT_CONTRACT_ADDRESS as string
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

const startToXPlaying = [PositionType.Start, PositionType.XPlaying];
const xPlayingToOPlaying = [PositionType.XPlaying, PositionType.OPlaying];
const oPlayingToXPlaying = [PositionType.OPlaying, PositionType.XPlaying];
const xPlayingToVictory = [PositionType.XPlaying, PositionType.Victory];
const oPlayingToVictory = [PositionType.OPlaying, PositionType.Victory];
const oPlayingToDraw = [PositionType.OPlaying, PositionType.Draw];
const drawToStart = [PositionType.Draw, PositionType.Start];
const victoryToStart = [PositionType.Victory, PositionType.Start];

async function validTransition({
  isValid,
  positionType,
  stake,
  Xs,
  Os,
  balances
}: {
  isValid: boolean;
  positionType: PositionType[];
  stake: number[];
  Xs: number[];
  Os: number[];
  balances: AssetOutcomeShortHand[];
}): Promise<void> {
  const fromBalances: AssetOutcomeShortHand = replaceAddressesAndBigNumberify(
    balances[0],
    addresses
  ) as AssetOutcomeShortHand;
  const toBalances: AssetOutcomeShortHand = replaceAddressesAndBigNumberify(
    balances[1],
    addresses
  ) as AssetOutcomeShortHand;
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
    fromAllocation.push({destination: key, amount: fromBalances[key].toString()})
  );
  Object.keys(toBalances).forEach(key =>
    toAllocation.push({destination: key, amount: toBalances[key].toString()})
  );
  const fromOutcome = [{assetHolderAddress: AddressZero, allocationItems: fromAllocation}];
  const toOutcome = [{assetHolderAddress: AddressZero, allocationItems: toAllocation}];
  const fromAppData: TTTData = {
    positionType: fromPositionType,
    stake: bigNumberify(fromStake).toString(),
    Xs: fromXs,
    Os: fromOs
  };
  const toAppData: TTTData = {
    positionType: toPositionType,
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

describe('validTransition', () => {
  it.each`
    isValid  | positionType          | Xs                            | Os                            | balances               | description
    ${true}  | ${startToXPlaying}    | ${[0b000000000, 0b000000001]} | ${[0b000000000, 0b000000000]} | ${balanceStartToAWins} | ${'X can start a game'}
    ${true}  | ${xPlayingToOPlaying} | ${[0b000000001, 0b000000001]} | ${[0b000000000, 0b000000010]} | ${balanceAWinsToBWins} | ${'O can make a move'}
    ${true}  | ${oPlayingToXPlaying} | ${[0b000000001, 0b000000101]} | ${[0b000000010, 0b000000010]} | ${balanceBWinsToAWins} | ${'X can make a move'}
    ${true}  | ${oPlayingToVictory}  | ${[0b000000011, 0b000000111]} | ${[0b000011000, 0b000011000]} | ${balanceBWinsToAWins} | ${'X can win'}
    ${true}  | ${xPlayingToVictory}  | ${[0b000011000, 0b000011000]} | ${[0b000000011, 0b000000111]} | ${balanceAWinsToBWins} | ${'O can win'}
    ${true}  | ${oPlayingToDraw}     | ${[0b101100010, 0b101100011]} | ${[0b010011100, 0b010011100]} | ${balanceBWinsToDraw}  | ${'X can draw'}
    ${true}  | ${drawToStart}        | ${[0b000000000, 0b000000000]} | ${[0b000000000, 0b000000000]} | ${balanceDrawToStart}  | ${'Draw can restart'}
    ${true}  | ${victoryToStart}     | ${[0b000000000, 0b000000000]} | ${[0b000000000, 0b000000000]} | ${balanceAWinsToStart} | ${'X Victory can restart'}
    ${true}  | ${victoryToStart}     | ${[0b000000000, 0b000000000]} | ${[0b000000000, 0b000000000]} | ${balanceBWinsToStart} | ${'O Victory can restart'}
    ${false} | ${startToXPlaying}    | ${[0b000000000, 0b000000000]} | ${[0b000000000, 0b000000000]} | ${balanceStartToAWins} | ${`X doesn't make a move`}
    ${false} | ${startToXPlaying}    | ${[0b000000000, 0b000000001]} | ${[0b000000000, 0b000000010]} | ${balanceStartToAWins} | ${'O changed during X move'}
    ${false} | ${startToXPlaying}    | ${[0b000000000, 0b000000011]} | ${[0b000000000, 0b000000000]} | ${balanceStartToAWins} | ${`X can't start with 2 marks`}
    ${false} | ${xPlayingToOPlaying} | ${[0b000000001, 0b000000001]} | ${[0b000000000, 0b000000000]} | ${balanceAWinsToBWins} | ${`O doesn't move`}
    ${false} | ${xPlayingToOPlaying} | ${[0b000000000, 0b000000001]} | ${[0b000000000, 0b000000010]} | ${balanceAWinsToBWins} | ${'X changed during O move'}
    ${false} | ${xPlayingToOPlaying} | ${[0b000000001, 0b000000001]} | ${[0b000000000, 0b000000001]} | ${balanceAWinsToBWins} | ${`O can't override a mark`}
    ${false} | ${xPlayingToOPlaying} | ${[0b000000001, 0b000000001]} | ${[0b000000000, 0b000000101]} | ${balanceAWinsToBWins} | ${`O can't make 2 marks`}
    ${false} | ${oPlayingToXPlaying} | ${[0b000000001, 0b000000001]} | ${[0b000000010, 0b000000010]} | ${balanceBWinsToAWins} | ${`X doesn't move`}
    ${false} | ${oPlayingToXPlaying} | ${[0b000000001, 0b000000101]} | ${[0b000000010, 0b000000110]} | ${balanceBWinsToAWins} | ${'O changed during X move'}
    ${false} | ${oPlayingToXPlaying} | ${[0b000000001, 0b000000011]} | ${[0b000000010, 0b000000010]} | ${balanceBWinsToAWins} | ${`X can't override a mark`}
    ${false} | ${oPlayingToXPlaying} | ${[0b000000001, 0b000001011]} | ${[0b000000010, 0b000000010]} | ${balanceBWinsToAWins} | ${`X can't make 2 marks`}
    ${false} | ${drawToStart}        | ${[0b101100010, 0b101100011]} | ${[0b010011100, 0b010011100]} | ${balanceDrawToStart}  | ${`Draw can't restart with marks`}
    ${false} | ${victoryToStart}     | ${[0b101100010, 0b101100011]} | ${[0b010011100, 0b010011100]} | ${balanceAWinsToStart} | ${`X Victory cant restart with marks`}
    ${false} | ${victoryToStart}     | ${[0b101100010, 0b101100011]} | ${[0b010011100, 0b010011100]} | ${balanceBWinsToStart} | ${'O Victory cant restart with marks'}
  `(
    `Returns $isValid on $positionType; $description`,
    async ({
      isValid,
      positionType,
      Xs,
      Os,
      balances
    }: {
      isValid: boolean;
      positionType: PositionType[];
      Xs: number[];
      Os: number[];
      balances: AssetOutcomeShortHand[];
    }) => {
      const validStake = [1, 1];
      await validTransition({isValid, positionType, Xs, Os, balances, stake: validStake});
    }
  );
  it(`stake can't change during a game`, async () => {
    const isValid = false;
    const balances = balanceStartToAWins;
    const positionType = startToXPlaying;
    const Xs = [0b000000000, 0b000000000];
    const Os = [0b000000000, 0b000000000];
    const invalidStake = [1, 2];
    await validTransition({isValid, positionType, Xs, Os, balances, stake: invalidStake});
  });
});
