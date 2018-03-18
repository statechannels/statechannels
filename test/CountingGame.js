import { pack as packState } from '../src/CountingGame';
import assertRevert from './helpers/assertRevert';

var IG = artifacts.require("./CountingGame.sol");
// enum names aren't supported in ABI, so have to use integers for time being
const START = 0;
const FINAL = 1;

contract('CountingGame', (accounts) => {
  let game;
  let start;
  let firstMove;
  let allowedFinal;
  let disallowedFinal;

  before(async () => {
    game = await IG.deployed();

    let pack = (stateNonce, stateType, aBal, bBal, points) => {
      return packState(
        game.address, 0, accounts[0], accounts[1],
        stateNonce, stateType, aBal, bBal, points
      );
    };

    start = pack(0, START, 5, 4, 3);
    firstMove = pack(1, START, 5, 4, 4);
    allowedFinal = pack(1, FINAL, 5, 4, 4);
    disallowedFinal = pack(1, FINAL, 5, 4, 2);
  });

  // Transition fuction tests
  // ========================

  it("allows a move where the points increment", async () => {
    var output = await game.validTransition.call(start, firstMove);
    assert.equal(output, true);
  });

  it("allows START -> FINAL if totals match", async () => {
    var output = await game.validTransition.call(start, allowedFinal);
    assert.equal(output, true);
  });

  it("doesn't allow START -> FINAL if totals don't match", async () => {
    await assertRevert(game.validTransition.call(start, disallowedFinal));
  });

  // Resolution function tests
  // =========================

  it("resolves the START correctly", async () => {
    let [aBal, bBal] = await game.resolve.call(start);
    assert.equal(aBal, 5);
    assert.equal(bBal, 4);
  });

  it("resolves the FINAL correctly", async () => {
    let [aBal, bBal] = await game.resolve.call(allowedFinal);
    assert.equal(aBal, 5);
    assert.equal(bBal, 4);
  });
});
