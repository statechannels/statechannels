import * as AppStates from '..';
import { Channel } from 'fmg-core';
import {
  Play,
  PreFundSetupA,
  PostFundSetupA,
  PostFundSetupB,
  Propose,
  Reveal,
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
const salt = "abc123";

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

  it("returns stake", () => {
    expect(appState.stake).toEqual(stake);
  });
};

const itHasPosition = (state, position) => {
   it("has a position", () => {
    expect(state.position).toEqual(position);
   });
};

describe("WaitForPreFundSetup", () => {
  const position = new PreFundSetupA(channel, 0, balances, 0, stake);
  const appState = new AppStates.WaitForPreFundSetup({ position });

  itHasSharedFunctionality(appState);
  itHasPosition(appState, position);

});

describe("WaitForPostFundSetup", () => {
  const position = new PostFundSetupA(channel, 0, balances, 0, stake);
  const appState = new AppStates.WaitForPostFundSetup({ position });

  itHasSharedFunctionality(appState);
  itHasPosition(appState, position);

});

describe("ChoosePlay", () => {
  const position = new PostFundSetupB(channel, 0, balances, 0, stake);
  const appState = new AppStates.ChoosePlay({ position });

  itHasSharedFunctionality(appState);
  itHasPosition(appState, position);

});

describe("WaitForAccept", () => {
  const position = new Propose(channel, 0, balances, stake, 'preCommit');
  const appState = new AppStates.WaitForAccept({ position, aPlay, salt });

  itHasSharedFunctionality(appState);
  itHasPosition(appState, position);

  it("returns aPlay", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the salt", () => {
    expect(appState.salt).toEqual(salt);
  });
});

describe("WaitForResting", () => {
  const position = new Reveal(channel, 0, balances, stake, bPlay, aPlay, salt);
  const appState = new AppStates.WaitForResting({ position });

  itHasSharedFunctionality(appState);
  itHasPosition(appState, position);

  it("returns aPlay", () => {
    expect(appState.aPlay).toEqual(aPlay);
  });

  it("returns the salt", () => {
    expect(appState.salt).toEqual(salt);
  });

  it("returns bPlay", () => {
    expect(appState.bPlay).toEqual(bPlay);
  });
});
