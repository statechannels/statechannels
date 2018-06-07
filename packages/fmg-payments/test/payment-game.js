import { Channel, State, assertRevert } from 'fmg-core';

import { PaymentGame } from '../src/payment-game';

var PaymentGameContract = artifacts.require("./PaymentGame.sol");

contract('PaymentGame', (accounts) => {
  let paymentGameContract, channel;
  let alice = accounts[0];
  let bob = accounts[0];

  before(async () => {
    paymentGameContract = await PaymentGameContract.deployed();
    channel = new Channel(paymentGameContract.address, 0, [alice, bob]);
  });

  const validTransition = async (state1, state2) => { 
    return await paymentGameContract.validTransition(state1.toHex(), state2.toHex());
  };

  it("allows a transition where the mover's balance decreases", async () => {
    let fromState = PaymentGame.gameState({ channel, turnNum: 0, resolution: [3, 5] });
    let toState = PaymentGame.gameState({ channel, turnNum: 1, resolution: [4, 4] });

    assert.equal(toState.mover, bob);
    assert(await validTransition(fromState, toState));
  });

  it("allows a transition where the balances stay the same", async () => {
    let fromState = PaymentGame.gameState({ channel, turnNum: 0, resolution: [3, 5] });
    let toState = PaymentGame.gameState({ channel, turnNum: 1, resolution: [3, 5] });

    assert(await validTransition(fromState, toState));
  });

  it("rejects a transition where the mover's balance increases", async () => {
    let fromState = PaymentGame.gameState({ channel, turnNum: 0, resolution: [3, 5] });
    let toState = PaymentGame.gameState({ channel, turnNum: 1, resolution: [1, 7] });

    assert.equal(toState.mover, bob);
    await assertRevert(validTransition(fromState, toState));
  });

  it("rejects a transition where the sum of the balances increases", async () => {
    // mover's balance doesn't increase but sum of balance increases
    let fromState = PaymentGame.gameState({ channel, turnNum: 0, resolution: [3, 5] });
    let toState = PaymentGame.gameState({ channel, turnNum: 1, resolution: [4, 5] });

    assert.equal(toState.mover, bob);
    await assertRevert(validTransition(fromState, toState));
  });

  it("rejects a transition where the sum of the balances decreases", async () => {
    // mover's balance decreases and sum of balance decreases
    let fromState = PaymentGame.gameState({ channel, turnNum: 0, resolution: [3, 5] });
    let toState = PaymentGame.gameState({ channel, turnNum: 1, resolution: [3, 4] });

    assert.equal(toState.mover, bob);
    await assertRevert(validTransition(fromState, toState));
  });
});
