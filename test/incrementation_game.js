import { pack } from '../src/incrementation_game';
import assertRevert from './helpers/assertRevert';

var IG = artifacts.require("./IncrementationGame.sol");
// enum names aren't supported in ABI, so have to use integers for time being
const START = 0;
const FINAL = 1;

contract('IncrementationGame', (accounts) => {
  let game;
  const start = pack(START, 5, 4, 3);
  const firstMove = pack(START, 5, 4, 4);
  const allowedFinal = pack(FINAL, 5, 4, 4);
  const disallowedFinal = pack(FINAL, 5, 4, 2);

  before(async () => {
    game = await IG.deployed();
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
