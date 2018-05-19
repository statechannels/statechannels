import { pack as packState } from '../src/CountingGame';
import assertRevert from './helpers/assertRevert';

var IG = artifacts.require("./CountingGame.sol");
// enum names aren't supported in ABI, so have to use integers for time being
const START = 0;
const CONCLUDED = 1;

contract('CountingGame', (accounts) => {
  let game;
  let start;
  let firstMove;
  let allowedConcluded;
  let disallowedConcluded;

  before(async () => {
    game = await IG.deployed();

    let pack = (turnNum, stateType, aBal, bBal, count) => {
      return packState(
        game.address, 0, accounts[0], accounts[1],
        turnNum, stateType, aBal, bBal, count
      );
    };

    start = pack(0, START, 5, 4, 3);
    firstMove = pack(1, START, 5, 4, 4);
    allowedConcluded = pack(1, CONCLUDED, 5, 4, 4);
    disallowedConcluded = pack(1, CONCLUDED, 5, 4, 2);
  });

  // Transition fuction tests
  // ========================

  it("allows a move where the count increment", async () => {
    var output = await game.validTransition.call(start, firstMove);
    assert.equal(output, true);
  });

  it("allows START -> CONCLUDED if totals match", async () => {
    var output = await game.validTransition.call(start, allowedConcluded);
    assert.equal(output, true);
  });

  it("doesn't allow START -> CONCLUDED if totals don't match", async () => {
    await assertRevert(game.validTransition.call(start, disallowedConcluded));
  });

  // Resolution function tests
  // =========================

  it("resolves the START correctly", async () => {
    let [aBal, bBal] = await game.resolve.call(start);
    assert.equal(aBal, 5);
    assert.equal(bBal, 4);
  });

  it("resolves the CONCLUDED correctly", async () => {
    let [aBal, bBal] = await game.resolve.call(allowedConcluded);
    assert.equal(aBal, 5);
    assert.equal(bBal, 4);
  });
});
