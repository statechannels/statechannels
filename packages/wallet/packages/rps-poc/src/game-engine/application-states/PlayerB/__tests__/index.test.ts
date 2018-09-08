import { Channel } from 'fmg-core';
import * as AppStates from '..';
import {
  Play,
  Result,
  PostFundSetupB,
  Accept,
  Resting,
  Propose,
  PreFundSetupB,
} from '../../../positions';
import BN from 'bn.js';

const gameLibrary = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';
const channelNonce = 15;
const participantA = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';
const participantB = '0xc1912fee45d61c87cc5ea59dae31190fffff232d';
const participants = [participantA, participantB];
const channel = new Channel(gameLibrary, channelNonce, participants);
const stake = new BN(1);
const aBal = new BN(4);
const bBal = new BN(5);
const balances = [aBal, bBal];
const aPlay = Play.Rock;
const bPlay = Play.Scissors;
const result = Result.YouLose;

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

  it("returns stake", () => {
    expect(appState.stake).toEqual(stake);
  });
};

const itHasPosition = (state, position) => {
   it("has a position", () => {
    expect(state.position).toEqual(position);
   });
};

describe("WaitForPostFundSetup", () => {
  const position = new PreFundSetupB(channel, 0, balances, 0, stake);
  const appState = new AppStates.WaitForPostFundSetup({ position });

  itHasSharedFunctionality(appState);
  itHasPosition(appState, position);

});

describe("WaitForPropose", () => {
  const position = new PostFundSetupB(channel, 0, balances, 0, stake);
  const appState = new AppStates.WaitForPropose({ position });

  itHasSharedFunctionality(appState);
  itHasPosition(appState, position);

});

describe("ChoosePlay", () => {
  const position = new Propose(channel, 0, balances, stake, 'precommit');
  const appState = new AppStates.ChoosePlay({ position });

  itHasSharedFunctionality(appState);
  itHasPosition(appState, position);

});

describe("WaitForReveal", () => {
  const position = new Accept(channel, 0, balances, stake, 'precommit', bPlay);
  const appState = new AppStates.WaitForReveal({ position });

  itHasSharedFunctionality(appState);
  itHasPosition(appState, position);

  it("returns b's play", () => {
    expect(appState.bPlay).toEqual(bPlay);
  });
});

describe("ViewREsult", () => {
  const position = new Resting(channel, 0, balances, stake);
  const appState = new AppStates.ViewResult({ position, aPlay, bPlay });

  itHasSharedFunctionality(appState);
  itHasPosition(appState, position);

  it("returns b's play", () => {
    expect(appState.bPlay).toEqual(bPlay);
  });

  it("returns a's play", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the result", () => {
    expect(appState.result).toEqual(result);
  });
});
