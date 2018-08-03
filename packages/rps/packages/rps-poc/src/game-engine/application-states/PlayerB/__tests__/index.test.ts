import { Channel } from 'fmg-core';
import * as AppStates from '..';
import Message from '../../../Message';
import { Play, Result } from '../../../pledges';

const gameLibrary = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';
const channelNonce = 15;
const participantA = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';
const participantB = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';
const participants = [participantA, participantB];
const channel = new Channel(gameLibrary, channelNonce, participants);
const stake = 1;
const aBal = 4;
const bBal = 5
const balances = [aBal, bBal];
const coreProps = { channel, stake, balances };
const adjudicator = 0xc;
const aPlay = Play.Rock;
const bPlay = Play.Scissors;
const salt = "abc123";
const message = new Message('state', 'signature'); // fake message
const result = Result.AWon;

const itHasSharedFunctionality = (appState) => {
  it("returns myAddress", () => {
    expect(appState.myAddress).toEqual(participantB);
  });

  it("returns opponentAddress", () => {
    expect(appState.opponentAddress).toEqual(participantA);
  });

  it("returns channelId", () => {
    expect(appState.channelId).toEqual(channel.id);
  });

  it("returns myBalance", () => {
    expect(appState.myBalance).toEqual(bBal);
  });

  it("returns opponentBalance", () => {
    expect(appState.opponentBalance).toEqual(aBal);
  });
};

describe("ReadyToSendPreFundSetupB", () => {
  let appState = new AppStates.ReadyToSendPreFundSetupB({ ...coreProps, message });

  itHasSharedFunctionality(appState);

  it("has a message", () => {
    expect(appState.message).toEqual(message);
  });
});

describe("WaitForAToDeploy", () => {
  let appState = new AppStates.WaitForAToDeploy({ ...coreProps });

  itHasSharedFunctionality(appState);
});

describe("ReadyToDeposit", () => {
  let transaction = { some: "transaction properties" };
  let appState = new AppStates.ReadyToDeposit({ ...coreProps, adjudicator, transaction });

  itHasSharedFunctionality(appState);

  it("has a transaction", () => {
    expect(appState.transaction).toEqual(transaction);
  });

  it("returns the address of the adjudicator", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });
});

describe("WaitForBlockchainDeposit", () => {
  let appState = new AppStates.WaitForBlockchainDeposit({ ...coreProps, adjudicator });

  itHasSharedFunctionality(appState);

  it("returns the address of the adjudicator", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });
});

describe("WaitForPostFundSetupA", () => {
  let appState = new AppStates.WaitForPostFundSetupA({ ...coreProps, adjudicator });

  itHasSharedFunctionality(appState);

  it("returns the address of the adjudicator", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });
});

describe("ReadyToSendPostFundSetupB", () => {
  let appState = new AppStates.ReadyToSendPostFundSetupB({
    ...coreProps,
    adjudicator,
    message,
  });

  itHasSharedFunctionality(appState);

  it("returns the address of the adjudicator", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("has a message", () => {
    expect(appState.message).toEqual(message);
  });
});

describe("WaitForPropose", () => {
  let appState = new AppStates.WaitForPropose({
    ...coreProps,
    adjudicator,
    message,
  });

  itHasSharedFunctionality(appState);

  it("returns the address of the adjudicator", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("has a message", () => {
    expect(appState.message).toEqual(message);
  });
});

describe("ReadyToChooseBPlay", () => {
  let appState = new AppStates.ReadyToChooseBPlay({
    ...coreProps,
    adjudicator,
  });

  itHasSharedFunctionality(appState);

  it("returns the address of the adjudicator", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });
});

describe("ReadyToSendAccept", () => {
  let appState = new AppStates.ReadyToSendAccept({
    ...coreProps,
    adjudicator,
    bPlay,
    message,
  });

  itHasSharedFunctionality(appState);

  it("returns the address of the adjudicator", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("returns b's play", () => {
    expect(appState.bPlay).toEqual(bPlay);
  });

  it("has a message", () => {
    expect(appState.message).toEqual(message);
  });
});

describe("WaitForReveal", () => {
  let appState = new AppStates.WaitForReveal({
    ...coreProps,
    adjudicator,
    bPlay,
    message,
  });

  itHasSharedFunctionality(appState);

  it("returns the address of the adjudicator", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("returns b's play", () => {
    expect(appState.bPlay).toEqual(bPlay);
  });

  it("has a message", () => {
    expect(appState.message).toEqual(message);
  });
});

describe("ReadyToSendResting", () => {
  let appState = new AppStates.ReadyToSendResting({
    ...coreProps,
    adjudicator,
    bPlay,
    aPlay,
    salt,
    result,
    message,
  });

  itHasSharedFunctionality(appState);

  it("returns the address of the adjudicator", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("returns b's play", () => {
    expect(appState.bPlay).toEqual(bPlay);
  });

  it("returns a's play", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the salt", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the result", () => {
    expect(appState.result).toEqual(result);
  });

  it("has a message", () => {
    expect(appState.message).toEqual(message);
  });
});
