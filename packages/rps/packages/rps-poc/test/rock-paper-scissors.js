import BN from 'bn.js';
import { assertRevert } from 'fmg-core';
import { scenarios, encode } from '../src/core';

import hexToBN from '../src/utils/hexToBN';
import bnToHex from '../src/utils/bnToHex';

const RPS = artifacts.require("./RockPaperScissorsGame.sol");

contract('RockPaperScissors', (accounts) => {
  let rpsContract;

  let postFundSetupB, propose, accept, reveal, resting;

  before(async () => {
    rpsContract = await RPS.deployed();
    const libraryAddress = rpsContract.address;

    const scenario = scenarios.build(libraryAddress, accounts[0], accounts[1]);
    postFundSetupB = scenario.postFundSetupB;
    propose = scenario.propose;
    accept = scenario.accept;
    reveal = scenario.reveal;
    resting = scenario.resting;
  });


  const validTransition = async (state1, state2) => {
    return await rpsContract.validTransition(encode(state1), encode(state2));
  };


  // Transition function tests
  // ========================

  it("allows START -> ROUNDPROPOSED", async () => {
    assert(await validTransition(postFundSetupB, propose));
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
    assert(await validTransition(propose, accept));
  });

  it("allows ROUNDACCEPTED -> REVEAL", async () => {
    assertRevert(await validTransition(accept, reveal));
  });

  it("allows REVEAL -> (updated) START", async () => {
    assert(await validTransition(reveal, resting));
  });

  it("disallows transitions where the stake changes", async () => {
    reveal.roundBuyIn = bnToHex(hexToBN(reveal.roundBuyIn).add(new BN(1)));
    assertRevert(validTransition(reveal, resting));
  });
});
