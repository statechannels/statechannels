import { scenarios, encode, convertToAbsoluteResult } from '../src/core';
import { assertRevert } from 'fmg-core';

const TTT = artifacts.require("TicTacToeGame.sol");

contract('TicTacToeGame', (accounts) => {
  let tttContract;  
  let playing1, playing2;
  let propose, reject, rest, cheatreject;

  before(async () => {
    
    tttContract = await TTT.deployed();
    
    const libraryAddress = tttContract.address;

    const scenario = scenarios.build(libraryAddress, accounts[0], accounts[1]);
    playing1 = scenario.playing1;
    playing2 = scenario.playing2;

    const scenario2 = scenarios.aRejectsGame;
    rest = scenario2.rest;
    propose = scenario2.propose;
    reject = scenario2.reject;

    cheatreject = scenario2.cheatreject
  });

  const validTransition = async (state1, state2) => {
    return await tttContract.validTransition(encode(state1), encode(state2));
  };

  // Transition function tests
  // ========================

  it("allows REST -> XPLAYING", async () => {
    assert(await validTransition(rest, propose));
  });

  it("allows XPLAYING -> REST (game rejected)", async () => {
    assert(await validTransition(propose, reject));
  });

// TODO not convinced about behaviour of assertRevert. seems to pass on a return true, but not catch a require!
  // it("disallows XPLAYING -> REST (game rejected but with incorrect balances)", async () => {
  //   assertRevert(await validTransition(propose, cheatreject));
  // });

  it("allows XPLAYING -> OPLAYING", async () => {
    assert(await validTransition(playing1, playing2));
  });
});
