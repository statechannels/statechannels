import { Channel, assertRevert } from 'fmg-core';
import { RpsGame } from '../src/rock-paper-scissors';

var RpsStateContract = artifacts.require("./RockPaperScissorsState.sol");

contract('RockPaperScissorsPositions', (accounts) => {

  const preCommit = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const salt = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const turnNum = 4;
  const resolution = [4, 5];
  const stake = 2;
  const aPlay = RpsGame.Plays.ROCK;
  const bPlay = RpsGame.Plays.SCISSORS;

  // Serializing / Deserializing
  // ===========================

  let channel = new Channel("0xdeadbeef", 0, [accounts[0], accounts[1]]);
  let original = RpsGame.revealState({
    channel,
    turnNum,
    resolution,
    stake,
    preCommit,
    aPlay,
    bPlay,
    salt,
  });
  
  let stateContract;

  before( async () => {
    stateContract = await RpsStateContract.deployed();
  });

  // skipped because web3 can't cope with the positionType object that is returned
  it.skip("can parse positionType", async () => {
    assert.equal(await stateContract.positionType(original.toHex()), original.positionType);
  });

  it("can parse aBal", async () => {
    assert.equal(await stateContract.aResolution(original.toHex()), resolution[0]);
  });

  it("can parse bBal", async () => {
    assert.equal(await stateContract.bResolution(original.toHex()), resolution[1]);
  });

  it("can parse stake", async () => {
    assert.equal(await stateContract.stake(original.toHex()), stake);
  });

  it("can parse preCommit", async () => {
    assert.equal(await stateContract.preCommit(original.toHex()), preCommit);
  });

  // skipped because web3 can't cope with the Play object that is returned
  it.skip("can parse bPlay", async () => {
    assert.equal(await stateContract.bPlay.call(original.toHex()), bPlay);
  });

  // skipped because web3 can't cope with the Play object that is returned
  it.skip("can parse aPlay", async () => {
    assert.equal(await stateContract.aPlay.call(original.toHex()), aPlay);
  });

  it("can parse salt", async () => {
    assert.equal(await stateContract.salt(original.toHex()), salt);
  });

});
