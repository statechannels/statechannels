import { expectRevert } from 'magmo-devtools';
import * as scenarios from '../core/test-scenarios';

import * as ethers from 'ethers';

import RPSGameArtifact from '../../build/contracts/RockPaperScissorsGame.json';
import { asEthersObject } from 'fmg-core';
import { RPSCommitment, asCoreCommitment } from '../core/rps-commitment';
import { bigNumberify } from 'ethers/utils';
jest.setTimeout(20000);

describe('Rock paper Scissors', () => {
  let networkId;
  const provider = new ethers.providers.JsonRpcProvider(
    `http://localhost:${process.env.GANACHE_PORT}`,
  );
  let rpsContract;

  let postFundSetupB: RPSCommitment;
  let postFundSetupB2: RPSCommitment;
  let propose: RPSCommitment;
  let propose2: RPSCommitment;
  let propose3: RPSCommitment;

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
    postFundSetupB2 = scenario.postFundSetupB2;
    propose = scenario.propose;
    propose2 = scenario.propose2;
    propose3 = scenario.propose3;
    accept = scenario.accept;
    reveal = scenario.reveal;
    resting = scenario.resting;
  });

  const validTransition = async (commitment1: RPSCommitment, commitment2: RPSCommitment) => {
    const coreCommitment1 = asCoreCommitment(commitment1);
    const coreCommitment2 = asCoreCommitment(commitment2);

    return await rpsContract.validTransition(
      asEthersObject(coreCommitment1),
      asEthersObject(coreCommitment2),
    );
  };

  // Transition function tests
  // ========================

  it('allows START -> ROUNDPROPOSED', async () => {
    expect(await validTransition(postFundSetupB, propose)).toBe(true);
  });

  it('allows ROUNDPROPOSED -> ROUNDACCEPTED', async () => {
    expect(await validTransition(propose, accept)).toBe(true);
  });

  it('allows ROUNDACCEPTED -> REVEAL', async () => {
    expect(await validTransition(accept, reveal)).toBe(true);
  });

  it('allows REVEAL -> (updated) START', async () => {
    expect(await validTransition(reveal, resting)).toBe(true);
  });

  it('disallows transitions where the stake changes', async () => {
    reveal.stake = bigNumberify(88).toHexString();
    const coreCommitment1 = asCoreCommitment(reveal);
    const coreCommitment2 = asCoreCommitment(resting);
    expect.assertions(1);
    await expectRevert(
      () =>
        rpsContract.validTransition(
          asEthersObject(coreCommitment1),
          asEthersObject(coreCommitment2),
        ),
      'The stake should be the same between commitments',
    );
  });

  it('disallows transitions where the allocations change incorrectly', async () => {
    const coreCommitment1 = asCoreCommitment(postFundSetupB);
    const coreCommitment2 = asCoreCommitment(propose2);
    expect.assertions(1);
    await expectRevert(
      () =>
        rpsContract.validTransition(
          asEthersObject(coreCommitment1),
          asEthersObject(coreCommitment2),
        ),
      'The allocation for player A must be the same between commitments',
    );
  });

  it('disallows transitions where destination changes', async () => {
    const coreCommitment1 = asCoreCommitment({ ...propose });
    const coreCommitment2 = asCoreCommitment({
      ...accept,
      destination: ['0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb'],
    });
    expect.assertions(1);
    await expectRevert(
      () =>
        rpsContract.validTransition(
          asEthersObject(coreCommitment1),
          asEthersObject(coreCommitment2),
        ),
      'The destination field must not change',
    );
  });

  it('disallows a stake that the players cannot afford', async () => {
    const coreCommitment1 = asCoreCommitment(postFundSetupB2);
    const coreCommitment2 = asCoreCommitment(propose3);
    expect.assertions(1);
    await expectRevert(
      () =>
        rpsContract.validTransition(
          asEthersObject(coreCommitment1),
          asEthersObject(coreCommitment2),
        ),
      'The allocation for player A must not fall below the stake.',
    );
  });

  // The following scenario is highly notional, since the situation should (and is) prevented from occuring at the Propose stage
  it('Reverts an underflow via SafeMath', async () => {
    reveal.stake = accept.stake = bigNumberify(20).toHexString();
    accept.allocation = [bigNumberify(0).toHexString(), bigNumberify(0).toHexString()] as [
      string,
      string
    ];
    reveal.allocation = [bigNumberify(40).toHexString(), bigNumberify(0).toHexString()] as [
      string,
      string
    ];

    const coreCommitment1 = asCoreCommitment(accept);
    const coreCommitment2 = asCoreCommitment(reveal);
    expect.assertions(1);
    await expectRevert(
      () =>
        rpsContract.validTransition(
          asEthersObject(coreCommitment1),
          asEthersObject(coreCommitment2),
        ),
      'revert',
    ); // Note that SafeMath does not have revert messages
  });
});
