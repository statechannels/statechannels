import { Channel, State, assertRevert, increaseTime, duration } from 'fmg-core';

import { RpsGame } from '../src/rock-paper-scissors';

var RPS = artifacts.require("./RockPaperScissorsGame.sol");

contract('RockPaperScissors', (accounts) => {
  let rpsContract;
  const salt = "0xaaa"; // some random bytes32 value
  const aPlay = RpsGame.Plays.ROCK;
  const bPlay = RpsGame.Plays.SCISSORS;
  const stake = 2;
  const initBals = [5, 4];
  const aAhead = [7, 2];
  const bAhead = [3, 6]
  let initialState;
  let proposeState;
  let acceptState;
  let revealState;
  let restState;

  before(async () => {
    rpsContract = await RPS.deployed();

    let channel = new Channel(rpsContract.address, 0, [accounts[0], accounts[1]]);

    initialState = RpsGame.restingState({ channel, turnNum: 0, resolution: initBals });
    proposeState = RpsGame.proposeState({ channel, turnNum: 1, resolution: initBals, stake, aPlay, salt});
    let preCommit = proposeState.preCommit;
    acceptState = RpsGame.acceptState({ channel, turnNum: 2, stake, preCommit, bPlay, resolution: bAhead });
    revealState = RpsGame.revealState({ channel, turnNum: 3, stake, aPlay, bPlay, salt, resolution: aAhead });
    restState = RpsGame.restingState({ channel, turnNum: 4, resolution: aAhead });
  });


  const validTransition = async (state1, state2) => { 
    return await rpsContract.validTransition(state1.toHex(), state2.toHex());
  };


  // Transition fuction tests
  // ========================

  it("allows START -> ROUNDPROPOSED", async () => {
    assert(await validTransition(initialState, proposeState));
  });

  // TODO: add this back in once concluded states are in
  // it("allows START -> CONCLUDED if totals match", async () => {
  //   var output = await rpsGame.validTransition.call(initialState.toHex(), allowedConcluded);
  //   assert.equal(output, true);
  // });
  //
  // it("doesn't allow START -> CONCLUDED if totals don't match", async () => {
  //   await assertRevert(rpsGame.validTransition.call(start, disallowedConcluded));
  // });

  it("allows ROUNDPROPOSED -> ROUNDACCEPTED", async () => {
    assert(await validTransition(proposeState, acceptState));
  });

  it("allows ROUNDACCEPTED -> REVEAL", async () => {
    assert(await validTransition(acceptState, revealState));
  });

  it("allows REVEAL -> (updated) START", async () => {
    assert(await validTransition(revealState, restState));
  });

  // Resolution function tests
  // =========================

  it("resolves the START correctly", async () => {
    let [aBal, bBal] = await rpsContract.resolve.call(initialState.toHex());
    assert.equal(aBal, 5);
    assert.equal(bBal, 4);
  });

  // TODO: add back when concluded states are in
  // it("resolves the CONCLUDED correctly", async () => {
  //   skip();
  //   let [aBal, bBal] = await rpsGame.resolve.call(allowedConcluded);
  //   assert.equal(aBal, 5);
  //   assert.equal(bBal, 4);
  // });

  it("resolves the ROUNDPROPOSED correctly", async () => {
    let [aBal, bBal] = await rpsContract.resolve.call(proposeState.toHex());
    assert.equal(aBal, 5);
    assert.equal(bBal, 4);
  });

  it("resolves the ROUNDACCEPTED correctly", async () => {
    // in this state it is assumed that a isn't revealing because b won
    let [aBal, bBal] = await rpsContract.resolve.call(acceptState.toHex());
    assert.equal(aBal, 3);
    assert.equal(bBal, 6);
  });

  it("resolves the REVEAL correctly", async () => {
    // in the reveal state we can see that B did win
    let [aBal, bBal] = await rpsContract.resolve.call(revealState.toHex());
    assert.equal(aBal, 7);
    assert.equal(bBal, 2);
  });

});
