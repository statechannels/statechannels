import * as AppStates from '..';
import { Channel } from 'fmg-core';
import { Play, Result, PreFundSetup } from '../../../positions';

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
const aPlay = Play.Rock;
const bPlay = Play.Scissors;
const salt = "abc123";
const position = new PreFundSetup(channel, 0, balances, 0, stake);
const result = Result.YouWin;

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
  const appState = new AppStates.ReadyToSendPreFundSetupA({ ...coreProps, position });

  itHasSharedFunctionality(appState);

  it("has a position", () => {
    expect(appState.position).toEqual(position);
  });
});

describe("WaitForPreFundSetupB", () => {
  const appState = new AppStates.WaitForPreFundSetupB({ ...coreProps, position });

  itHasSharedFunctionality(appState);

  it("has a position", () => {
    expect(appState.position).toEqual(position);
  });
});


describe("ReadyToSendPostFundSetupA", () => {
  const appState = new AppStates.ReadyToSendPostFundSetupA({ ...coreProps, position });

  itHasSharedFunctionality(appState);

  it("has a position", () => {
    expect(appState.position).toEqual(position);
  });
});

describe("WaitForPostFundSetupB", () => {
  const appState = new AppStates.WaitForPostFundSetupB({ ...coreProps, position });

  itHasSharedFunctionality(appState);

  it("has a position", () => {
    expect(appState.position).toEqual(position);
  });
});

describe("ReadyToChooseAPlay", () => {
  const appState = new AppStates.ReadyToChooseAPlay({ ...coreProps, turnNum: 3 });

  itHasSharedFunctionality(appState);
});

describe("ReadyToSendPropose", () => {
  const appState = new AppStates.ReadyToSendPropose({
    ...coreProps,
    aPlay,
    salt,
    position,
  });

  itHasSharedFunctionality(appState);

  it("returns aPlay", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the salt", () => {
    expect(appState.salt).toEqual(salt);
  });

  it("returns the position", () => {
    expect(appState.position).toEqual(position);
  });
});

describe("WaitForAccept", () => {
  const appState = new AppStates.WaitForAccept({
    ...coreProps,
    aPlay,
    salt,
    position,
  });

  itHasSharedFunctionality(appState);

  it("returns aPlay", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the salt", () => {
    expect(appState.salt).toEqual(salt);
  });

  it("returns the position", () => {
    expect(appState.position).toEqual(position);
  });
});

describe("ReadyToSendReveal", () => {
  const appState = new AppStates.ReadyToSendReveal({
    ...coreProps,
    aPlay,
    bPlay,
    result,
    salt,
    position,
  });

  itHasSharedFunctionality(appState);

  it("returns aPlay", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the salt", () => {
    expect(appState.salt).toEqual(salt);
  });

  it("returns bPlay", () => {
    expect(appState.bPlay).toEqual(bPlay);
  });

  it("returns the position", () => {
    expect(appState.position).toEqual(position);
  });
});

describe("WaitForResting", () => {
  const appState = new AppStates.WaitForResting({
    ...coreProps,
    aPlay,
    bPlay,
    result,
    salt,
    position,
  });

  itHasSharedFunctionality(appState);

  it("returns aPlay", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the salt", () => {
    expect(appState.salt).toEqual(salt);
  });

  it("returns bPlay", () => {
    expect(appState.bPlay).toEqual(bPlay);
  });

  it("returns the position", () => {
    expect(appState.position).toEqual(position);
  });
});
