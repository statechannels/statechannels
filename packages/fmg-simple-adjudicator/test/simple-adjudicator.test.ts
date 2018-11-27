import {
  Channel,
  State,
  expectRevert,
  increaseTime,
  DURATION,
  CountingGame,
  sign,
  SolidityType,
} from 'fmg-core';
import StateArtifact from '../build/contracts/State.json';
import RulesArtifact from '../build/contracts/Rules.json';
import CountingStateArtifact from '../build/contracts/CountingState.json';
import CountingGameArtifact from '../build/contracts/CountingGame.json';
import SimpleAdjudicatorArtifact from '../build/contracts/SimpleAdjudicator.json';
import BN from 'bn.js';
import { assert } from 'chai';
import linker from 'solc/linker';
import { ethers, ContractFactory, Wallet } from 'ethers';
import { expectEvent } from 'magmo-devtools';

import * as truffleAssert from 'truffle-assertions';

jest.setTimeout(20000);

const aBal = ethers.utils.parseUnits('6', 'wei');
const bBal = ethers.utils.parseUnits('4', 'wei');
const resolution = [aBal, bBal];
const differentResolution = [bBal, aBal];

describe('SimpleAdjudicator', () => {
  let networkId;
  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  // the following private key is funded with 1 million eth in the startGanache function
  const privateKey = "0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d";
  const wallet = new Wallet(privateKey, provider);

  let simpleAdj;
  let channel;
  let state0;
  let state1;
  let state2;
  let state3;
  let state1alt;
  let state2alt;
 
  const alice = ethers.Wallet.createRandom();
  const bob = ethers.Wallet.createRandom();
  let aliceDestination;
  let bobDestination;

  const challenger = bob;
  const challengee = alice;

  let aliceState;
  let bobState;

  beforeEach(async () => {
    function linkedByteCode(artifact, linkedLibrary) {
      const lookup = {};
      try { 
        lookup[linkedLibrary.contractName] = linkedLibrary.networks[networkId].address;
      } catch(err) {
        // tslint:disable-next-line:no-console
        console.error(linkedLibrary.networks, linkedLibrary.contractName, networkId);
      }
      return linker.linkBytecode(artifact.bytecode, lookup);
    }

    networkId = (await provider.getNetwork()).chainId;
    CountingStateArtifact.bytecode = linkedByteCode(CountingStateArtifact, StateArtifact);

    CountingGameArtifact.bytecode = (linker.linkBytecode(CountingGameArtifact.bytecode, { "CountingState": CountingStateArtifact.networks[networkId].address}));
    const countingGameContract = await ContractFactory.fromSolidity(CountingGameArtifact, wallet).attach(CountingGameArtifact.networks[networkId].address);

    channel = new Channel(
      countingGameContract.address.toLowerCase(),
      0,
      [alice.address.toLowerCase(), bob.address.toLowerCase()]
    );

    state0 = CountingGame.gameState({
      channel,
      resolution,
      turnNum: 6,
      gameCounter: 1,
    });
    state1 = CountingGame.gameState({
      channel,
      resolution,
      turnNum: 7,
      gameCounter: 2,
    });
    state2 = CountingGame.gameState({
      channel,
      resolution,
      turnNum: 8,
      gameCounter: 3,
    });
    state3 = CountingGame.gameState({
      channel,
      resolution,
      turnNum: 9,
      gameCounter: 4,
    });

    state1alt = CountingGame.gameState({
      channel,
      resolution: differentResolution,
      turnNum: 7,
      gameCounter: 2,
    });
    state2alt = CountingGame.gameState({
      channel,
      resolution: differentResolution,
      turnNum: 8,
      gameCounter: 3,
    });

    SimpleAdjudicatorArtifact.bytecode = linkedByteCode(SimpleAdjudicatorArtifact, StateArtifact);
    SimpleAdjudicatorArtifact.bytecode = linkedByteCode(SimpleAdjudicatorArtifact, RulesArtifact);

    simpleAdj = await ContractFactory.fromSolidity(SimpleAdjudicatorArtifact, wallet).deploy(channel.id, 5);
  });

  it("forceMove emits ForceMove", async () => {
    const agreedState = state0;
    const challengeState = state1;
    const responseState = state2;

    const { r: r0, s: s0, v: v0 } = sign(agreedState.toHex(), challengee.privateKey);
    const { r: r1, s: s1, v: v1 } = sign(challengeState.toHex(), challenger.privateKey);

    expect(await simpleAdj.currentChallengePresent()).toBe(false);

    const filter = simpleAdj.filters.ChallengeCreated(null, null, null, null);
    
    const { emitterWitness, eventPromise } = expectEvent(simpleAdj, filter);

    await simpleAdj.forceMove(
      agreedState.toHex(), challengeState.toHex(), [v0, v1], [r0, r1], [s0, s1]
    );
    await eventPromise;

    expect(await simpleAdj.currentChallengePresent()).toBe(true);
    expect(emitterWitness).toBeCalled();
  });

  it("forceMove -> respondWithMove", async () => {
    const agreedState = state0;
    const challengeState = state1;
    const responseState = state2;

    const { r: r0, s: s0, v: v0 } = sign(agreedState.toHex(), challengee.privateKey);
    const { r: r1, s: s1, v: v1 } = sign(challengeState.toHex(), challenger.privateKey);

    assert.equal(await simpleAdj.currentChallengePresent(), false);

    await simpleAdj.forceMove(
      agreedState.toHex(), challengeState.toHex(), [v0, v1], [r0, r1], [s0, s1]
    );
    assert.equal(await simpleAdj.currentChallengePresent(), true);

    const { r: r2, s: s2, v: v2 } = sign(responseState.toHex(), challengee.privateKey);

    const { emitterWitness, eventPromise } = expectEvent(simpleAdj, "RespondedWithMove");
    await simpleAdj.respondWithMove(responseState.toHex(), v2, r2, s2);
    await eventPromise;

    expect(emitterWitness).toBeCalled();
    assert.equal(await simpleAdj.currentChallengePresent(), false);
  });

  it("forceMove -> refute", async () => {
    const agreedState = state0;
    const challengeState = state1;
    const refutationState = state3;

    const { r: r0, s: s0, v: v0 } = sign(agreedState.toHex(), challengee.privateKey);
    const { r: r1, s: s1, v: v1 } = sign(challengeState.toHex(), challenger.privateKey);

    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge exists at start of game");

    await simpleAdj.forceMove(agreedState.toHex(), challengeState.toHex(), [v0, v1], [r0, r1], [s0, s1]);
    assert.equal(await simpleAdj.currentChallengePresent(), true, "challenge wasn't created");

    // refute
    const { r: r2, s: s2, v: v2 } = sign(refutationState.toHex(), challenger.privateKey);

    const { emitterWitness, eventPromise } = expectEvent(simpleAdj, "Refuted");
    await simpleAdj.refute(refutationState.toHex(), v2, r2, s2);

    await eventPromise;
    expect(emitterWitness).toBeCalled();
    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge wasn't canceled");
  });

  it("forceMove -> alternativeRespondWithMove", async () => {
    const agreedState = state0;
    const challengeState = state1;
    const alternativeState = state1alt;
    const responseState = state2alt;

    const { r: r0, s: s0, v: v0 } = sign(agreedState.toHex(), challengee.privateKey);
    const { r: r1, s: s1, v: v1 } = sign(challengeState.toHex(), challenger.privateKey);

    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge exists at start of game");

    await simpleAdj.forceMove(agreedState.toHex(), challengeState.toHex(), [v0, v1], [r0, r1], [s0, s1]);
    assert.equal(await simpleAdj.currentChallengePresent(), true, "challenge not created");

    const {
      r: r2,
      s: s2,
      v: v2,
    } = sign(alternativeState.toHex(), challenger.privateKey);
    const {
      r: r3,
      s: s3,
      v: v3,
    } = sign(responseState.toHex(), challengee.privateKey);

    const { emitterWitness, eventPromise } = expectEvent(simpleAdj, "RespondedWithAlternativeMove");
    await simpleAdj.alternativeRespondWithMove(
      alternativeState.toHex(),
      responseState.toHex(),
      [v2, v3], [r2, r3], [s2, s3]
    );

    await eventPromise;
    expect(emitterWitness).toBeCalled();

    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge not cancelled");
  });

  it("can only be concluded once", async () => {
    aliceState = state0;
    bobState = state1;
    aliceState.stateType = State.StateType.Conclude;
    bobState.stateType = State.StateType.Conclude;
    const {
      r: r0,
      s: s0,
      v: v0,
    } = sign(aliceState.toHex(), alice.privateKey);
    const {
      r: r1,
      s: s1,
      v: v1,
    } = sign(bobState.toHex(), bob.privateKey);
    await simpleAdj.conclude(aliceState.toHex(), bobState.toHex(), [v0, v1], [r0, r1], [s0, s1]);
    expectRevert(
      simpleAdj.conclude(aliceState.toHex(), bobState.toHex(), [v0, v1], [r0, r1], [s0, s1])
    );
  });

  describe("withdrawals", () => {
    async function withdrawHelper(account, destination) {
      const { v, r, s } = sign(
        [{
            type: SolidityType.address,
            value: account.address,
          },
          {
            type: SolidityType.address,
            value: destination,
          },
          {
            type: SolidityType.bytes32,
            value: channel.id,
          },
        ],
        account.privateKey
      );

      const tx = await simpleAdj.withdraw(
        account.address,
        destination,
        channel.id,
        v, r, s,
      );
      await tx.wait();
    }

    beforeEach(async () => {
      aliceState = state0;
      bobState = state1;

      // Generate random destination addresses for more deterministic tests.
      // How ironic.
      aliceDestination = (ethers.Wallet.createRandom()).address.toLowerCase();
      bobDestination = (ethers.Wallet.createRandom()).address.toLowerCase();

      simpleAdj = await ContractFactory.fromSolidity(SimpleAdjudicatorArtifact, wallet).deploy(channel.id, 5);
    });

    it("conclude -> withdraw", async () => {
      await wallet.sendTransaction({
        to: simpleAdj.address,
        value: aBal.add(bBal),
        gasPrice: 0,
      });

      assert.equal(
        Number(await provider.getBalance(simpleAdj.address)),
        Number(aBal.add(bBal)),
        "Funds were not deposited in the SimpleAdjudicator"
      );

      // create a valid conclusion proof
      aliceState.stateType = State.StateType.Conclude;
      bobState.stateType = State.StateType.Conclude;

      const { r: r0, s: s0, v: v0 } = sign(aliceState.toHex(), alice.privateKey);
      const { r: r1, s: s1, v: v1 } = sign(bobState.toHex(), bob.privateKey);

      assert.equal(
        Number(await provider.getBalance(aliceDestination)),
        0,
        "Alice's balance resolved incorrectly before her withdrawal."
      );

      // pass the conclusion proof
      await simpleAdj.conclude(
        aliceState.toHex(),
        bobState.toHex(),
        [v0, v1], [r0, r1], [s0, s1]
      );

      await withdrawHelper(alice, aliceDestination);

      assert.equal(
        Number(await provider.getBalance(aliceDestination)),
        Number(aliceState.resolution[0]),
        "Alice's balance resolved incorrectly after her withdrawal."
      );

      assert.equal(
        Number(await provider.getBalance(bobDestination)),
        0,
        "Bob's balance resolved incorrectly before his withdrawal."
      );

      await withdrawHelper(bob, bobDestination);

      assert.equal(
        Number(await provider.getBalance(bobDestination)),
        Number(bBal),
        "Bob's balance resolved incorrectly after his withdrawal."
      );

      assert.equal(
        Number(await provider.getBalance(simpleAdj.address)),
        0,
        "SimpleAdjudicator wasn't emptied"
      );

      await withdrawHelper(bob, bobDestination);

      assert.equal(
        Number(await provider.getBalance(bobDestination)),
        Number(bBal),
        "Bob withdrew multiple times."
      );
    });

    it("forceMove -> timeout -> withdraw", async () => {
      // fund the contract
      await wallet.sendTransaction({
        to: simpleAdj.address,
        value: aBal.add(bBal),
        gasPrice: 0,
      });

      assert.equal(
        Number(await provider.getBalance(simpleAdj.address)),
        Number(aBal.add(bBal)),
        "Funds were not deposited in the SimpleAdjudicator"
      );

      const { r: r0, s: s0, v: v0 } = sign(aliceState.toHex(), alice.privateKey);
      const { r: r1, s: s1, v: v1 } = sign(bobState.toHex(), bob.privateKey);

      await simpleAdj.forceMove(aliceState.toHex(), bobState.toHex(), [v0, v1], [r0, r1], [s0, s1]);
      await increaseTime(DURATION.days(2), provider);

      await withdrawHelper(alice, aliceDestination);
      await withdrawHelper(bob, bobDestination);

      assert.equal(
        Number(await provider.getBalance(simpleAdj.address)),
        0,
        "SimpleAdjudicator wasn't emptied"
      );
      assert.equal(
        Number(await provider.getBalance(bobDestination)),
        Number(bBal),
        "Resolved Bob's balances incorrectly."
      );
      assert.equal(
        Number(await provider.getBalance(aliceDestination)),
        Number(aBal),
        "Resolved Alice's balances incorrectly."
      );
    });

    it("allows proper withdrawals in an insufficiently funded game", async () => {
      await wallet.sendTransaction({
        to: simpleAdj.address,
        value: bBal,
        gasPrice: 0,
      });

      assert.equal(
        Number(await provider.getBalance(simpleAdj.address)),
        Number(bBal),
        "Funds were not deposited in the SimpleAdjudicator"
      );

      aliceState.stateType = State.StateType.Conclude;
      bobState.stateType = State.StateType.Conclude;

      const { r: r0, s: s0, v: v0 } = sign(aliceState.toHex(), alice.privateKey);
      const { r: r1, s: s1, v: v1 } = sign(bobState.toHex(), bob.privateKey);

      await simpleAdj.conclude(aliceState.toHex(), bobState.toHex(), [v0, v1], [r0, r1], [s0, s1]);
      await withdrawHelper(bob, bobDestination);

      assert.equal(
        Number(await provider.getBalance(bobDestination)),
        0,
        "Bob took alice's money."
      );

      await withdrawHelper(alice, aliceDestination);
      assert.equal(
        Number(await provider.getBalance(aliceDestination)),
        Number(bBal),
        "Alice's balance resolved incorrectly after her withdrawal."
      );

      assert.equal(
        (await provider.getBalance(simpleAdj.address)).toNumber(),
        0,
        "SimpleAdjudicator wasn't emptied"
      );
    });
  });

  describe.skip('events', async () => {
    it.skip('emits fundsReceived upon contract creation', async () => {
      CountingStateArtifact.bytecode = (linker.linkBytecode(CountingStateArtifact.bytecode, { "State": StateArtifact.networks[networkId].address }));

      CountingGameArtifact.bytecode = (linker.linkBytecode(CountingGameArtifact.bytecode, { "CountingState": CountingStateArtifact.networks[networkId].address}));
      const countingGameContract = await ContractFactory.fromSolidity(CountingGameArtifact, wallet).attach(CountingGameArtifact.networks[networkId].address);

      simpleAdj = await ContractFactory.fromSolidity(SimpleAdjudicatorArtifact, wallet).deploy(channel.id, 5);

      channel = new Channel(countingGameContract.address, 0, [alice.address, bob.address]);

      simpleAdj = await ContractFactory.fromSolidity(SimpleAdjudicatorArtifact, wallet).deploy(channel.id, 5);

      const result = await truffleAssert.createTransactionResult(simpleAdj, simpleAdj.transactionHash);

      truffleAssert.eventEmitted(result, 'FundsReceived', (event) => {
        return (
          event.adjudicatorBalance.eq(new BN(0))
        );
      });
    });

    it.skip('emits fundsReceived upon being sent funds', async () => {
      const { eventPromise } = expectEvent(simpleAdj, "FundsReceived");

      await wallet.sendTransaction({
        to: bob.address,
        value: ethers.utils.parseEther('10'),
      });

      const b = bob.connect(provider);
      await b.sendTransaction({
        to: simpleAdj.address,
        value: 50,
      });
      await wallet.sendTransaction({
        to: simpleAdj.address,
        value: 100,
      });

      (await eventPromise);
      const { sender, recipient, amountReceived, adjudicatorBalance } = (await eventPromise).args;

      expect({
        sender,
        recipient,
        amountReceived: amountReceived.toHexString(),
        adjudicatorBalance: adjudicatorBalance.toHexString(),
      }).toMatchObject({
        sender: b.address,
        recipient: simpleAdj.address,
        amountReceived: ethers.utils.bigNumberify('100').toHexString(),
        adjudicatorBalance: ethers.utils.bigNumberify('150').toHexString(),
      });
    });
  });
});