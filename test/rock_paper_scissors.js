
import assertRevert from './helpers/assertRevert';

var RPS = artifacts.require("./RockPaperScissors.sol");
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
  const start = pack(START, 5, 4, 0, "0x00", 0, 0, 0);
  const allowedFinal = pack(FINAL, 5, 4, 0, "0x00", 0, 0, 0);
  const salt = 0xdeadbeef; // some random bytes32 value
  const preCommit = hashCommitment(ROCK, salt);
  const propose = pack(PROPOSED, 4, 3, 1, preCommit, 0, 0, 0);
  const accept = pack(ACCEPTED, 4, 3, 1, preCommit, PAPER, 0, 0);
  const reveal = pack(REVEAL, 4, 3, 1, preCommit, PAPER, ROCK, salt);
  const newStart = pack(START, 4, 5, 0, "0x00", 0, 0, 0);

  before(async () => {
    rpsGame = await RPS.deployed();
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
    let disallowedFinal = pack(FINAL, 3, 6, 0, "0x00", 0, 0, 0); // totals don't match
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

function pack(stateType, aBal, bBal, stake, aPreCommit, bPlay, aPlay, aSalt) {
  return (
    "0x" +
    toHex32(stateType) +
    toHex32(aBal) +
    toHex32(bBal) +
    toHex32(stake) +
    padBytes32(aPreCommit).substr(2, 66) +
    toHex32(bPlay) +
    toHex32(aPlay) +
    toHex32(aSalt)
  );
}

function hashCommitment(play, salt) {
  let paddedPlay = toHex32(play);
  let paddedSalt = toHex32(salt);
  return web3.sha3(paddedPlay + paddedSalt, {encoding: 'hex'}); // concat and hash
}

function toHex32(num) {
  return toPaddedHexString(num, 64);
}

function padBytes32(data){
  let l = 66-data.length
  let x = data.substr(2, data.length)

  for(var i=0; i<l; i++) {
    x = 0 + x
  }
  return '0x' + x
}

// https://stackoverflow.com/a/42203200
function toPaddedHexString(num, len) {
    let str = num.toString(16);
    return "0".repeat(len - str.length) + str;
}
