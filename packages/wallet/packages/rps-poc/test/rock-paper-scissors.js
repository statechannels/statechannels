import { Channel, assertRevert, padBytes32 } from 'fmg-core';
import { Play, Resting, Propose, Accept, Reveal } from '../src/game-engine/positions';

const RPS = artifacts.require("./RockPaperScissorsGame.sol");

contract('RockPaperScissors', (accounts) => {
  let rpsContract;
  const salt = padBytes32("0xaaa"); // some random bytes32 value
  const aPlay = Play.Rock;
  const bPlay = Play.Scissors;
  const stake = 2;
  const initBals = [5, 4];
  const aAhead = [7, 2];
  const bAhead = [3, 6];
  let initialState;
  let proposeState;
  let acceptState;
  let revealState;
  let restState;

  before(async () => {
    rpsContract = await RPS.deployed();

    const channel = new Channel(rpsContract.address, 0, [accounts[0], accounts[1]]);

    initialState = new Resting( channel, 0, initBals, stake);
    proposeState = Propose.createWithPlayAndSalt(channel, 1, initBals, stake, aPlay, salt)
    const preCommit = proposeState.preCommit;

    acceptState = new Accept(channel, 2, bAhead, stake, preCommit, bPlay);
    revealState = new Reveal(channel, 3, aAhead, stake, bPlay, aPlay, salt);
    restState = new Resting(channel, 4, aAhead, stake);
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
    assertRevert(await validTransition(acceptState, revealState));
  });

  it("allows REVEAL -> (updated) START", async () => {
    assert(await validTransition(revealState, restState));
  });

  it("disallows transitions where the stake changes", async () => {
    revealState.stake = revealState.stake + 1;
    assertRevert(validTransition(revealState, restState));
  });
});
