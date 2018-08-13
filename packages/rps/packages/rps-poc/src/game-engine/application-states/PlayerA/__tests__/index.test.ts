import * as AppStates from '..';
import { Channel } from 'fmg-core';
import Move from '../../../Move';
import { Play, Result } from '../../../positions';

const gameLibrary = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';
const channelNonce = 15;
const participantA = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';
const participantB = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';
const participants = [participantA, participantB];
const channel = new Channel(gameLibrary, channelNonce, participants);
const stake = 1;
const aBal = 4;
const bBal = 5;
const balances = [aBal, bBal];
const coreProps = { channel, stake, balances };
const adjudicator = 0xc;
const aPlay = Play.Rock;
const bPlay = Play.Scissors;
const salt = "abc123";
const move = new Move('state', 'signature'); // fake move
const result = Result.AWon;

const itHasSharedFunctionality = (appState) => {
  it("returns myAddress", () => {
    expect(appState.myAddress).toEqual(participantA);
  });

  it("returns opponentAddress", () => {
    expect(appState.opponentAddress).toEqual(participantB);
  });

  it("returns channelId", () => {
    expect(appState.channelId).toEqual(channel.id);
  });

  it("returns myBalance", () => {
    expect(appState.myBalance).toEqual(aBal);
  });

  it("returns opponentBalance", () => {
    expect(appState.opponentBalance).toEqual(bBal);
  });
};

describe("ReadyToSendPreFundSetupA", () => {
  const appState = new AppStates.ReadyToSendPreFundSetupA({ ...coreProps, move });

  itHasSharedFunctionality(appState);

  it("has a move", () => {
    expect(appState.move).toEqual(move);
  });
});

describe("WaitForPreFundSetupB", () => {
  const appState = new AppStates.WaitForPreFundSetupB({ ...coreProps, move });

  itHasSharedFunctionality(appState);

  it("has a move", () => {
    expect(appState.move).toEqual(move);
  });
});

describe("ReadyToDeploy", () => {
  const transaction = { some: "properties to craft a transaction" };
  const appState = new AppStates.ReadyToDeploy({ ...coreProps, transaction });

  itHasSharedFunctionality(appState);

  it("has a transaction", () => {
    expect(appState.transaction).toEqual(transaction);
  });
});

describe("WaitForBlockchainDeploy", () => {
  const appState = new AppStates.WaitForBlockchainDeploy({ ...coreProps });

  itHasSharedFunctionality(appState);
});

describe("WaitForBToDeposit", () => {
  const appState = new AppStates.WaitForBToDeposit({ ...coreProps, adjudicator });

  itHasSharedFunctionality(appState);

  it("returns the adjudicator address", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });
});

describe("ReadyToSendPostFundSetupA", () => {
  const appState = new AppStates.ReadyToSendPostFundSetupA({ ...coreProps, adjudicator, move });

  itHasSharedFunctionality(appState);

  it("returns the adjudicator address", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("has a move", () => {
    expect(appState.move).toEqual(move);
  });
});

describe("WaitForPostFundSetupB", () => {
  const appState = new AppStates.WaitForPostFundSetupB({ ...coreProps, adjudicator, move });

  itHasSharedFunctionality(appState);

  it("returns the adjudicator address", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("has a move", () => {
    expect(appState.move).toEqual(move);
  });
});

describe("ReadyToChooseAPlay", () => {
  const appState = new AppStates.ReadyToChooseAPlay({ ...coreProps, turnNum: 3, adjudicator });

  itHasSharedFunctionality(appState);

  it("returns the adjudicator address", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });
});

describe("ReadyToSendPropose", () => {
  const appState = new AppStates.ReadyToSendPropose({
    ...coreProps,
    adjudicator,
    aPlay,
    salt,
    move,
  });

  itHasSharedFunctionality(appState);

  it("returns the adjudicator address", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("returns aPlay", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the salt", () => {
    expect(appState.salt).toEqual(salt);
  });

  it("returns the move", () => {
    expect(appState.move).toEqual(move);
  });
});

describe("WaitForAccept", () => {
  const appState = new AppStates.WaitForAccept({
    ...coreProps,
    adjudicator,
    aPlay,
    salt,
    move,
  });

  itHasSharedFunctionality(appState);

  it("returns the adjudicator address", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("returns aPlay", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the salt", () => {
    expect(appState.salt).toEqual(salt);
  });

  it("returns the move", () => {
    expect(appState.move).toEqual(move);
  });
});

describe("ReadyToSendReveal", () => {
  const appState = new AppStates.ReadyToSendReveal({
    ...coreProps,
    adjudicator,
    aPlay,
    bPlay,
    result,
    salt,
    move,
  });

  itHasSharedFunctionality(appState);

  it("returns the adjudicator address", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("returns aPlay", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the salt", () => {
    expect(appState.salt).toEqual(salt);
  });

  it("returns bPlay", () => {
    expect(appState.bPlay).toEqual(bPlay);
  });

  it("returns the move", () => {
    expect(appState.move).toEqual(move);
  });
});

describe("WaitForResting", () => {
  const appState = new AppStates.WaitForResting({
    ...coreProps,
    adjudicator,
    aPlay,
    bPlay,
    result,
    salt,
    move,
  });

  itHasSharedFunctionality(appState);

  it("returns the adjudicator address", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("returns aPlay", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the salt", () => {
    expect(appState.salt).toEqual(salt);
  });

  it("returns bPlay", () => {
    expect(appState.bPlay).toEqual(bPlay);
  });

  it("returns the move", () => {
    expect(appState.move).toEqual(move);
  });
});
