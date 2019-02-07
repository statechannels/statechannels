import BN from 'bn.js';
import { expectRevert } from 'magmo-devtools';
import {
  scenarios,
  encode
} from '../core';

import hexToBN from '../utils/hexToBN';
import bnToHex from '../utils/bnToHex';
import * as ethers from 'ethers';


import RPSGameArtifact from '../../build/contracts/RockPaperScissorsGame.json';

jest.setTimeout(20000);


describe("Rock paper Scissors", () => {
  let networkId;
  const provider = new ethers.providers.JsonRpcProvider(`http://localhost:${process.env.DEV_GANACHE_PORT}`);
  let rpsContract;

  let postFundSetupB;
  let propose;
  let accept;
  let reveal;
  let resting;

  beforeAll(async () => {

    networkId = (await provider.getNetwork()).chainId;
    const libraryAddress = RPSGameArtifact.networks[networkId].address;

    rpsContract = new ethers.Contract(libraryAddress, RPSGameArtifact.abi, provider);

    const account1 = ethers.Wallet.createRandom();
    const account2 = ethers.Wallet.createRandom();
    const scenario = scenarios.build(libraryAddress, account1.address, account2.address);
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
    expect(await validTransition(postFundSetupB, propose)).toBe(true);
  });

  it("allows ROUNDPROPOSED -> ROUNDACCEPTED", async () => {
    expect(await validTransition(propose, accept)).toBe(true);
  });

  it("allows ROUNDACCEPTED -> REVEAL", async () => {
    expect(await validTransition(accept, reveal)).toBe(true);
  });

  it("allows REVEAL -> (updated) START", async () => {
    expect(await validTransition(reveal, resting)).toBe(true);
  });

  it("disallows transitions where the stake changes", async () => {
    reveal.roundBuyIn = bnToHex(hexToBN(reveal.roundBuyIn).add(new BN(1)));
    expect.assertions(1);
    await expectRevert(
      () => rpsContract.validTransition(encode(reveal), encode(resting)),
      "The stake should be the same between states"
    );
  });
});