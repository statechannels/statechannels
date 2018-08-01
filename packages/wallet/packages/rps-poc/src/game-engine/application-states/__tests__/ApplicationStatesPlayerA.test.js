import * as AppStates from '../ApplicationStatesPlayerA';
import { Channel } from 'fmg-core';

const gameLibrary = 0x111;
const channelNonce = 15;
const participantA = 0xa;
const participantB = 0xb;
const participants = [participantA, participantB];
const channel = new Channel(gameLibrary, channelNonce, participants);
const stake = 1;
const aBal = 4;
const bBal = 5;
const balances = [aBal, bBal];
const coreProps = { channel, stake, balances };
const adjudicator = 0xc;
const aPlay = "rock";
const bPlay = "scissors";
const salt = "abc123";

const itHasSharedFunctionality = (appState) => {
  it("returns myAddress", () => {
    expect(appState.myAddress).toEqual(participantA);
  });

  it("returns opponentAddress", () => {
    expect(appState.opponentAddress).toEqual(participantB);
  });

  it("returns channelId", () => {
    expect(appState.channelId).toEqual(channel.channelId);
  });

  it("returns myBalance", () => {
    expect(appState.myBalance).toEqual(aBal);
  });

  it("returns opponentBalance", () => {
    expect(appState.opponentBalance).toEqual(bBal);
  });
};

describe("ReadyToSendPreFundSetup0", () => {
  let signedPreFundSetup0Message = "blahblah";
  let appState = new AppStates.ReadyToSendPreFundSetup0({ ...coreProps, signedPreFundSetup0Message });

  itHasSharedFunctionality(appState);

  it("has a message", () => {
    expect(appState.message).toEqual(signedPreFundSetup0Message);
  });

  it("has the right type", () => {
    expect(appState.type).toEqual(AppStates.types.ReadyToSendPreFundSetup0);
  });
});

describe("WaitForPreFundSetup1", () => {
  let signedPreFundSetup0Message = "blahblah";
  let appState = new AppStates.WaitForPreFundSetup1({ ...coreProps, signedPreFundSetup0Message });

  itHasSharedFunctionality(appState);

  it("has a message", () => {
    expect(appState.message).toEqual(signedPreFundSetup0Message);
  });
});

describe("ReadyToDeploy", () => {
  let deploymentTransaction = { some: "properties to craft a transaction" };
  let appState = new AppStates.ReadyToDeploy({ ...coreProps, deploymentTransaction });

  itHasSharedFunctionality(appState);

  it("has a transaction", () => {
    expect(appState.transaction).toEqual(deploymentTransaction);
  });
});

describe("WaitForBlockchainDeploy", () => {
  let appState = new AppStates.WaitForBlockchainDeploy({ ...coreProps });

  itHasSharedFunctionality(appState);
});

describe("WaitForBToDeposit", () => {
  let appState = new AppStates.WaitForBToDeposit({ ...coreProps, adjudicator });

  itHasSharedFunctionality(appState);

  it("returns the adjudicator address", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });
});

describe("ReadyToSendPostFundSetup0", () => {
  let signedPostFundSetup0Message = "blahblah";
  let appState = new AppStates.ReadyToSendPostFundSetup0({ ...coreProps, adjudicator, signedPostFundSetup0Message });

  itHasSharedFunctionality(appState);

  it("returns the adjudicator address", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("has a message", () => {
    expect(appState.message).toEqual(signedPostFundSetup0Message);
  });
});

describe("WaitForPostFundSetup1", () => {
  let signedPostFundSetup0Message = "blahblah";
  let appState = new AppStates.WaitForPostFundSetup1({ ...coreProps, adjudicator, signedPostFundSetup0Message });

  itHasSharedFunctionality(appState);

  it("returns the adjudicator address", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });

  it("has a message", () => {
    expect(appState.message).toEqual(signedPostFundSetup0Message);
  });
});

describe("ReadyToChooseAPlay", () => {
  let appState = new AppStates.ReadyToChooseAPlay({ ...coreProps, adjudicator });

  itHasSharedFunctionality(appState);

  it("returns the adjudicator address", () => {
    expect(appState.adjudicator).toEqual(adjudicator);
  });
});

describe("ReadyToSendPropose", () => {
  let signedProposeMessage = "some message";
  let appState = new AppStates.ReadyToSendPropose({
    ...coreProps,
    adjudicator,
    aPlay,
    salt,
    signedProposeMessage
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

  it("returns the message", () => {
    expect(appState.message).toEqual(signedProposeMessage);
  });
});

describe("WaitForAccept", () => {
  let signedProposeMessage = "some message";
  let appState = new AppStates.WaitForAccept({
    ...coreProps,
    adjudicator,
    aPlay,
    salt,
    signedProposeMessage
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

  it("returns the message", () => {
    expect(appState.message).toEqual(signedProposeMessage);
  });
});

describe("ReadyToSendReveal", () => {
  let signedRevealMessage = "some message";
  let result = "won";
  let appState = new AppStates.ReadyToSendReveal({
    ...coreProps,
    adjudicator,
    aPlay,
    bPlay,
    result,
    salt,
    signedRevealMessage
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

  it("returns the message", () => {
    expect(appState.message).toEqual(signedRevealMessage);
  });
});

describe("WaitForResting", () => {
  let signedRevealMessage = "some message";
  let result = "won";
  let appState = new AppStates.WaitForResting({
    ...coreProps,
    adjudicator,
    aPlay,
    bPlay,
    result,
    salt,
    signedRevealMessage
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

  it("returns the message", () => {
    expect(appState.message).toEqual(signedRevealMessage);
  });
});
