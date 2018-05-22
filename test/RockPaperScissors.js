import assertRevert from './helpers/assertRevert';

import { Position as RpsPosition} from '../src/RockPaperScissors';
import { Channel, State } from '../src/CommonState';

var RPS = artifacts.require("./RockPaperScissorsGame.sol");

contract('RockPaperScissors', (accounts) => {
  let rpsGame;
  const salt = "0xaaa"; // some random bytes32 value
  let allowedConcluded;
  let disallowedConcluded;
  let initialState;
  let proposeState;
  let acceptState;
  let revealState;
  let finalRestingState;

  before(async () => {
    rpsGame = await RPS.deployed();

    let channel = new Channel(rpsGame.address, 0, [accounts[0], accounts[1]]);
    let initialPosition = RpsPosition.initialPosition(5, 4);

    initialState = new State(channel, State.StateTypes.GAME, 0, initialPosition);
    proposeState = initialState.next(initialState.position.propose(1, RpsPosition.Plays.PAPER, salt));
    acceptState = proposeState.next(proposeState.position.accept(RpsPosition.Plays.SCISSORS));
    revealState = acceptState.next(acceptState.position.reveal(RpsPosition.Plays.PAPER, salt));
    finalRestingState = revealState.next(revealState.position.confirm());
  });

  // Transition fuction tests
  // ========================

  it("allows START -> ROUNDPROPOSED", async () => {
    var output = await rpsGame.validTransition.call(initialState.toHex(), proposeState.toHex());
    assert.equal(output, true);
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
    var output = await rpsGame.validTransition.call(proposeState.toHex(), acceptState.toHex());
    assert.equal(output, true);
  });

  it("allows ROUNDACCEPTED -> REVEAL", async () => {
    var output = await rpsGame.validTransition(acceptState.toHex(), revealState.toHex());
    assert.equal(output, true);
  });

  it("allows REVEAL -> (updated) START", async () => {
    var output = await rpsGame.validTransition.call(revealState.toHex(), finalRestingState.toHex());
    assert.equal(output, true);
  });

  // Resolution function tests
  // =========================

  it("resolves the START correctly", async () => {
    let [aBal, bBal] = await rpsGame.resolve.call(initialState.toHex());
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
    let [aBal, bBal] = await rpsGame.resolve.call(proposeState.toHex());
    assert.equal(aBal, 5);
    assert.equal(bBal, 4);
  });

  it("resolves the ROUNDACCEPTED correctly", async () => {
    // in this state it is assumed that a isn't revealing because b won
    let [aBal, bBal] = await rpsGame.resolve.call(acceptState.toHex());
    assert.equal(aBal, 4);
    assert.equal(bBal, 5);
  });

  it("resolves the REVEAL correctly", async () => {
    // in the reveal state we can see that B did win
    let [aBal, bBal] = await rpsGame.resolve.call(revealState.toHex());
    assert.equal(aBal, 4);
    assert.equal(bBal, 5);
  });


});
