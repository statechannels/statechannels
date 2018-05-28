import { pack as packState } from '../src/CountingGame';
import assertRevert from './helpers/assertRevert';

import { Position as CountingPosition } from '../src/CountingGame';
import { Channel, State } from '../src/CommonState';

var CountingGame = artifacts.require("./CountingGame.sol");
// enum names aren't supported in ABI, so have to use integers for time being
const START = 0;
const CONCLUDED = 1;

contract('CountingGame', (accounts) => {
  let game, state0, state1, stateBalChange;

  before(async () => {
    game = await CountingGame.deployed();
    let channel = new Channel(game.address, 0, [accounts[0], accounts[1]]);
    let startPosition = CountingPosition.initialPosition(5, 4);

    state0 = new State(channel, State.StateTypes.GAME, 0, startPosition);
    state1 = state0.next(state0.position.next());

    let posBalChange = new CountingPosition(4, 5, 1);
    stateBalChange = new State(channel, State.StateTypes.GAME, 1, posBalChange);
  });

  // Transition fuction tests
  // ========================

  it("allows a move where the count increment", async () => {
    var output = await game.validTransition.call(state0.toHex(), state1.toHex());
    assert.equal(output, true);
  });

  // it("allows START -> CONCLUDED if totals match", async () => {
  //   var output = await game.validTransition.call(start, allowedConcluded);
  //   assert.equal(output, true);
  // });

  it("doesn't allow transitions if totals don't match", async () => {
    await assertRevert(game.validTransition.call(state0.toHex(), stateBalChange.toHex()));
  });

  // Resolution function tests
  // =========================

  it("resolves states correctly", async () => {
    let [aBal, bBal] = await game.resolve.call(state0.toHex());
    assert.equal(aBal, 5);
    assert.equal(bBal, 4);
  });
});
