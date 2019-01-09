import { scenarios, encode } from '../src/core';

import hexToBN from '../src/utils/hexToBN';

const TTTStateContract = artifacts.require("./TicTacToeState.sol");

contract('TicTacToeState', (accounts) => {
  // Serializing / Deserializing
  // ===========================

  const scenario = scenarios.standard;
  // const propose = scenario.propose;
  // const reveal = scenario.reveal;
  const playing1 = scenario.playing1;
  const playing2 = scenario.playing2;

  let stateContract;

  before(async () => {
    stateContract = await TTTStateContract.deployed();
  });

  it("can parse aBal", async () => {
    const val = await stateContract.aResolution(encode(playing1));
    assert(val.eq(hexToBN(playing1.balances[0])));
  });

  it("can parse bBal", async () => {
    const val = await stateContract.bResolution(encode(playing1));
    assert(val.eq(hexToBN(playing1.balances[1])));
  });

  it("can parse stake", async () => {
    const val = await stateContract.stake(encode(playing1));
    assert(val.eq(hexToBN(playing1.roundBuyIn)));
  });

  it("can parse noughts", async () => {
    const val = await stateContract.noughts(encode(playing1));
    assert(val.eq(playing1.noughts));
  });

  it("can parse crosses", async () => {
    const val = await stateContract.crosses(encode(playing2));
    assert(val.eq(playing2.crosses));
  });
});
