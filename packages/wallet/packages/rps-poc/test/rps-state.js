import { scenarios, encode } from '../src/core';

const RpsStateContract = artifacts.require("./RockPaperScissorsState.sol");

contract('RockPaperScissorsState', (accounts) => {
  // Serializing / Deserializing
  // ===========================

  const scenario = scenarios.standard;
  const propose = scenario.propose;
  const reveal = scenario.reveal;

  let stateContract;

  before(async () => {
    stateContract = await RpsStateContract.deployed();

  });

  // skipped because web3 can't cope with the positionType object that is returned
  it.skip("can parse positionType", async () => {
    assert.equal(await stateContract.positionType(encode(reveal)), 'some type');
  });

  it("can parse aBal", async () => {
    const val = await stateContract.aResolution(encode(reveal));
    assert(val.eq(reveal.balances[0]));
  });

  it("can parse bBal", async () => {
    const val = await stateContract.bResolution(encode(reveal));
    assert(val.eq(reveal.balances[1]));
  });

  it("can parse stake", async () => {
    const val = await stateContract.stake(encode(reveal));
    assert(val.eq(reveal.roundBuyIn));
  });

  it("can parse preCommit", async () => {
    assert.equal(await stateContract.preCommit(encode(propose)), propose.preCommit);
  });

  // skipped because web3 can't cope with the Play object that is returned
  it.skip("can parse bPlay", async () => {
    assert.equal(await stateContract.bPlay.call(encode(reveal)), reveal.bsMove);
  });

  // skipped because web3 can't cope with the Play object that is returned
  it.skip("can parse aPlay", async () => {
    assert.equal(await stateContract.aPlay.call(encode(reveal)), reveal.asMove);
  });

  it("can parse salt", async () => {
    assert.equal(await stateContract.salt(encode(reveal)), reveal.salt);
  });

});
