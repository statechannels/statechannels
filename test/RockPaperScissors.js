
import assertRevert from './helpers/assertRevert';
import { pack as packState, hashCommitment } from '../src/RockPaperScissors'

var RPS = artifacts.require("./RockPaperScissorsGame.sol");
// enum names aren't supported in ABI, so have to use integers for time being
const START = 0;
const PROPOSED = 1;
const ACCEPTED = 2;
const REVEAL = 3;
const FINAL = 4;

const ROCK = 0;
const PAPER = 1;
const SCISSORS = 2;

contract('RockPaperScissors', (accounts) => {
  let rpsGame;
  const salt = 0xdeadbeef; // some random bytes32 value
  const preCommit = hashCommitment(ROCK, salt);
  let start;
  let allowedFinal;
  let disallowedFinal;
  let propose;
  let accept;
  let reveal;
  let newStart;


  before(async () => {
    rpsGame = await RPS.deployed();

    let pack = (stateNonce, stateType, aBal, bBal, stake, commit, aPlay, bPlay, salt) => {
      return packState(
        rpsGame.address, 0, accounts[0], accounts[1],
        stateNonce, stateType, aBal, bBal,
        stake, commit, aPlay, bPlay, salt
      );
    };

    start = pack(0, START, 5, 4, 0, "0x00", 0, 0, 0);
    allowedFinal = pack(1, FINAL, 5, 4, 0, "0x00", 0, 0, 0);
    disallowedFinal = pack(1, FINAL, 3, 6, 0, "0x00", 0, 0, 0); // totals don't match
    propose = pack(1, PROPOSED, 4, 3, 1, preCommit, 0, 0, 0);
    accept = pack(2, ACCEPTED, 4, 3, 1, preCommit, PAPER, 0, 0);
    reveal = pack(3, REVEAL, 4, 3, 1, preCommit, PAPER, ROCK, salt);
    newStart = pack(4, START, 4, 5, 0, "0x00", 0, 0, 0);
  });

  // Transition fuction tests
  // ========================

  it("allows START -> PROPOSED", async () => {
    var output = await rpsGame.validTransition.call(start, propose);
    assert.equal(output, true);
  });

  it("allows START -> FINAL if totals match", async () => {
    var output = await rpsGame.validTransition.call(start, allowedFinal);
    assert.equal(output, true);
  });

  it("doesn't allow START -> FINAL if totals don't match", async () => {
    await assertRevert(rpsGame.validTransition.call(start, disallowedFinal));
  });

  it("allows PROPOSED -> ACCEPTED", async () => {
    var output = await rpsGame.validTransition.call(propose, accept);
    assert.equal(output, true);
  });

  it("allows ACCEPTED -> REVEAL", async () => {
    var output = await rpsGame.validTransition.call(accept, reveal);
    assert.equal(output, true);
  });

  it("allows REVEAL -> (updated) START", async () => {
    var output = await rpsGame.validTransition.call(reveal, newStart);
    assert.equal(output, true);
  });

  // Resolution function tests
  // =========================

  it("resolves the START correctly", async () => {
    let [aBal, bBal] = await rpsGame.resolve.call(start);
    assert.equal(aBal, 5);
    assert.equal(bBal, 4);
  });

  it("resolves the FINAL correctly", async () => {
    let [aBal, bBal] = await rpsGame.resolve.call(allowedFinal);
    assert.equal(aBal, 5);
    assert.equal(bBal, 4);
  });

  it("resolves the PROPOSED correctly", async () => {
    let [aBal, bBal] = await rpsGame.resolve.call(propose);
    assert.equal(aBal, 5);
    assert.equal(bBal, 4);
  });

  it("resolves the ACCEPTED correctly", async () => {
    // in this state it is assumed that a isn't revealing because b won
    let [aBal, bBal] = await rpsGame.resolve.call(accept);
    assert.equal(aBal, 4);
    assert.equal(bBal, 5);
  });

  it("resolves the REVEAL correctly", async () => {
    // in the reveal state we can see that B did win
    let [aBal, bBal] = await rpsGame.resolve.call(reveal);
    assert.equal(aBal, 4);
    assert.equal(bBal, 5);
  });
});
