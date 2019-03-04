import { expectRevert } from 'magmo-devtools';
import * as scenarios from '../core/test-scenarios';

import * as ethers from 'ethers';


import RPSGameArtifact from '../../build/contracts/RockPaperScissorsGame.json';
import { asEthersObject } from 'fmg-core';
import { RPSCommitment, asCoreCommitment } from '../core/rps-commitment';
import { bigNumberify } from 'ethers/utils';
jest.setTimeout(20000);


describe("Rock paper Scissors", () => {
  let networkId;
  const provider = new ethers.providers.JsonRpcProvider(`http://localhost:${process.env.DEV_GANACHE_PORT}`);
  let rpsContract;

  let postFundSetupB: RPSCommitment;
  let propose: RPSCommitment;
  let accept: RPSCommitment;
  let reveal: RPSCommitment;
  let resting: RPSCommitment;

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



  const validTransition = async (commitment1: RPSCommitment, commitment2: RPSCommitment) => {
    const coreCommitment1 = asCoreCommitment(commitment1);
    const coreCommitment2 = asCoreCommitment(commitment2);

    return await rpsContract.validTransition(asEthersObject(coreCommitment1), asEthersObject(coreCommitment2));
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
    reveal.stake = bigNumberify(88).toHexString();
    const coreCommitment1 = asCoreCommitment(reveal);
    const coreCommitment2 = asCoreCommitment(resting);
    expect.assertions(1);
    await expectRevert(
      () => rpsContract.validTransition(asEthersObject(coreCommitment1), asEthersObject(coreCommitment2)),
      "The stake should be the same between commitments"
    );
  });
});