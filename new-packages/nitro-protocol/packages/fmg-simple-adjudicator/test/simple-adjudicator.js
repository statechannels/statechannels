import { Channel, State, assertRevert, increaseTime, duration } from 'fmg-core';
import { CountingGame } from 'fmg-core/test/test-game/src/counting-game';

var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");
var StateLib = artifacts.require("fmg-core/contracts/State.sol");
var CountingStateContract = artifacts.require("fmg-core/test/test-game/contracts/CountingState.sol");
var CountingGameContract = artifacts.require("fmg-core/test/test-game/contracts/CountingGame.sol");
const truffleAssert = require('truffle-assertions');

const START_BALANCE = 100000000000000000000;

const A_IDX = 1;
const B_IDX = 2;
const aBal = Number(web3.toWei(6, "ether"));
const bBal = Number(web3.toWei(4, "ether"));
const resolution = [aBal, bBal];
const differentResolution = [bBal, aBal];

contract('SimpleAdjudicator', (accounts) => {
  let simpleAdj, countingGame;
  let channel;
  let state0, state1, state2, state3, state1alt, state2alt;

  let alice, aliceState, aliceBal, r0, v0, s0;
  let bob,   bobState,   bobBal,   r1, v1, s1;

  before(async () => {
    CountingStateContract.link(StateLib);
    let stateContract = await CountingStateContract.new();
    CountingGameContract.link("CountingState", stateContract.address);
    let countingGameContract = await CountingGameContract.new();
    channel = new Channel(countingGameContract.address, 0, [accounts[A_IDX], accounts[B_IDX]]);

    state0 = CountingGame.gameState({channel, resolution, turnNum: 6, gameCounter: 1});
    state1 = CountingGame.gameState({channel, resolution, turnNum: 7, gameCounter: 2});
    state2 = CountingGame.gameState({channel, resolution, turnNum: 8, gameCounter: 3});
    state3 = CountingGame.gameState({channel, resolution, turnNum: 9, gameCounter: 4});

    state1alt = CountingGame.gameState({channel, resolution: differentResolution, turnNum: 7, gameCounter: 2});
    state2alt = CountingGame.gameState({channel, resolution: differentResolution, turnNum: 8, gameCounter: 3});

    simpleAdj = await SimpleAdjudicator.new(channel.id);
  });

  it("forceMove emits ForceMove", async () => {
    let agreedState = state0;
    let challengeState = state1;
    let responseState = state2;

    let challenger = accounts[B_IDX];
    let challengee = accounts[A_IDX];

    let [r0, s0, v0] = agreedState.sign(challengee);
    let [r1, s1, v1] = challengeState.sign(challenger);

    assert.equal(await simpleAdj.currentChallengePresent(), false);

    let tx = await simpleAdj.forceMove(
      agreedState.toHex(), challengeState.toHex(), [v0, v1], [r0, r1], [s0, s1]
    );

    truffleAssert.eventEmitted(tx, "ChallengeCreated", (event) => {
      return event.channelId === channel.id && event.state === challengeState.toHex();
    })

    // Have to cancel the challenge as to not muck up further tests...
    let [r2, s2, v2] = responseState.sign(challengee);
    await simpleAdj.respondWithMove(responseState.toHex(), v2, r2, s2);
  });

  it("forceMove -> respondWithMove", async () => {
    let agreedState = state0;
    let challengeState = state1;
    let responseState = state2;

    let challenger = accounts[B_IDX];
    let challengee = accounts[A_IDX];

    let [r0, s0, v0] = agreedState.sign(challengee);
    let [r1, s1, v1] = challengeState.sign(challenger);

    assert.equal(await simpleAdj.currentChallengePresent(), false);

    await simpleAdj.forceMove(
      agreedState.toHex(), challengeState.toHex(), [v0, v1], [r0, r1], [s0, s1]
    );
    assert.equal(await simpleAdj.currentChallengePresent(), true);

    let [r2, s2, v2] = responseState.sign(challengee);
    let tx = await simpleAdj.respondWithMove(responseState.toHex(), v2, r2, s2);

    assert.equal(await simpleAdj.currentChallengePresent(), false);
    truffleAssert.eventEmitted(tx, "RespondedWithMove", (event) => {
      return event.response === responseState.toHex();
    })
  });

  it("forceMove -> refute", async () => {
    let agreedState = state0;
    let challengeState = state1;
    let refutationState = state3;

    let challenger = accounts[B_IDX];
    let challengee = accounts[A_IDX];

    let [r0, s0, v0] = agreedState.sign(challengee);
    let [r1, s1, v1] = challengeState.sign(challenger);

    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge exists at start of game");

    await simpleAdj.forceMove(agreedState.toHex(), challengeState.toHex(), [v0, v1], [r0, r1], [s0, s1] );
    assert.equal(await simpleAdj.currentChallengePresent(), true, "challenge wasn't created");

    // refute
    let [r2, s2, v2] = refutationState.sign(challenger);

    let tx = await simpleAdj.refute(refutationState.toHex(), v2, r2, s2);
    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge wasn't canceled");
    truffleAssert.eventEmitted(tx, "Refuted", (event) => {
      return event.refutation === refutationState.toHex();
    })
  });

  it("forceMove -> alternativeRespondWithMove", async () => {
    let agreedState = state0;
    let challengeState = state1;
    let alternativeState = state1alt;
    let responseState = state2alt;

    let challenger = accounts[B_IDX];
    let challengee = accounts[A_IDX];

    let [r0, s0, v0] = agreedState.sign(challengee);
    let [r1, s1, v1] = challengeState.sign(challenger);

    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge exists at start of game");

    await simpleAdj.forceMove(agreedState.toHex(), challengeState.toHex(), [v0, v1], [r0, r1], [s0, s1] );
    assert.equal(await simpleAdj.currentChallengePresent(), true, "challenge not created");

    let [r2, s2, v2] = alternativeState.sign(challenger);
    let [r3, s3, v3] = responseState.sign(challengee);

    let tx = await simpleAdj.alternativeRespondWithMove(
      alternativeState.toHex(),
      responseState.toHex(),
      [v2, v3], [r2, r3], [s2, s3]
    );

    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge not cancelled");
    truffleAssert.eventEmitted(tx, "RespondedWithAlternativeMove", (event) => {
      return event.alternativeResponse === responseState.toHex();
    })
  });

  it("can only be concluded once", async () => {
    aliceState = state0;
    bobState = state1;

    alice = accounts[A_IDX];
    bob = accounts[B_IDX];

    aliceState.stateType = State.StateTypes.CONCLUDE;
    bobState.stateType = State.StateTypes.CONCLUDE;

    [r0, s0, v0] = aliceState.sign(alice);
    [r1, s1, v1] = bobState.sign(bob);

    await simpleAdj.conclude(aliceState.toHex(), bobState.toHex(), [v0, v1], [r0, r1], [s0, s1] );
    assertRevert(
      simpleAdj.conclude(aliceState.toHex(), bobState.toHex(), [v0, v1], [r0, r1], [s0, s1])
    );
  });

  describe("withdrawals", () => {
    beforeEach(async () => {
      aliceState = state0;
      bobState = state1;

      alice = accounts[A_IDX];
      bob = accounts[B_IDX];

      aliceBal = aBal;
      bobBal = bBal;

      simpleAdj = await SimpleAdjudicator.new(channel.id);
    });

    it("forceMove -> timeout -> withdraw", async () => {
      // fund the contract
      await web3.eth.sendTransaction({
        from: alice, // challengee
        to: simpleAdj.address,
        value: aliceBal,
        gasPrice: 0
      });

      await web3.eth.sendTransaction({
        from: bob, // challenger
        to: simpleAdj.address,
        value: bobBal,
        gasPrice: 0
      });

      assert.equal(
        web3.eth.getBalance(simpleAdj.address),
        aliceBal + bobBal,
        "Funds were not deposited in the SimpleAdjudicator"
      );
      assert.equal(
        Number(web3.eth.getBalance(bob)),
        START_BALANCE - bobBal,
        "Funds were not deposited from bob"
      );
      assert.equal(
        Number(web3.eth.getBalance(alice)),
        START_BALANCE - aliceBal,
        "Funds were not deposited from alice"
      );


      [r0, s0, v0] = aliceState.sign(alice);
      [r1, s1, v1] = bobState.sign(bob);

      await simpleAdj.forceMove(aliceState.toHex(), bobState.toHex(), [v0, v1], [r0, r1], [s0, s1] );
      await increaseTime(duration.days(2));
      await simpleAdj.withdraw(alice);
      await simpleAdj.withdraw(bob);

      assert.equal(
        web3.eth.getBalance(simpleAdj.address),
        0,
        "SimpleAdjudicator wasn't emptied"
      );
      assert.equal(
        Number(web3.eth.getBalance(bob)),
        START_BALANCE,
        "Resolved balances incorrectly."
      );
      assert.equal(
        Number(web3.eth.getBalance(alice)),
        START_BALANCE,
        "Resolved balances incorrectly."
      );
    });

    it("conclude -> withdraw", async () => {
      await web3.eth.sendTransaction({
        from: alice,
        to: simpleAdj.address,
        value: aliceBal,
        gasPrice: 0
      });

      await web3.eth.sendTransaction({
        from: bob,
        to: simpleAdj.address,
        value: bobBal,
        gasPrice: 0
      });

      assert.equal(
        web3.eth.getBalance(simpleAdj.address),
        aliceBal + bobBal,
        "Funds were not deposited in the SimpleAdjudicator"
      );
      assert.equal(
        Number(web3.eth.getBalance(bob)),
        START_BALANCE - bobBal,
        "Funds were not deposited from bob"
      );
      assert.equal(
        Number(web3.eth.getBalance(alice)),
        START_BALANCE - aliceBal,
        "Funds were not deposited from alice"
      );

      aliceState.stateType = State.StateTypes.CONCLUDE;
      bobState.stateType = State.StateTypes.CONCLUDE;

      [r0, s0, v0] = aliceState.sign(alice);
      [r1, s1, v1] = bobState.sign(bob);

      await simpleAdj.conclude(aliceState.toHex(), bobState.toHex(), [v0, v1], [r0, r1], [s0, s1] );

      await simpleAdj.withdraw(bob);
      assert.equal(
        Number(web3.eth.getBalance(bob)),
        START_BALANCE,
        "Bob's balance resolved incorrectly after his withdrawal."
      );

      assert.equal(
        Number(web3.eth.getBalance(alice)),
        START_BALANCE - aliceBal,
        "Alice's balance resolved incorrectly before her withdrawal."
      );

      await simpleAdj.withdraw(alice);
      assert.equal(
        Number(web3.eth.getBalance(alice)),
        START_BALANCE,
        "Alice's balance resolved incorrectly after her withdrawal."
      );

      assert.equal(
        web3.eth.getBalance(simpleAdj.address),
        0,
        "SimpleAdjudicator wasn't emptied"
      );

      await simpleAdj.withdraw(bob);
      assert.equal(
        Number(web3.eth.getBalance(bob)),
        START_BALANCE,
        "Bob withdrew multiple times."
      );
    });

    it("allows proper withdrawals in an insufficiently funded game", async () => {
      await web3.eth.sendTransaction({
        from: bob,
        to: simpleAdj.address,
        value: bobBal,
        gasPrice: 0
      });

      assert.equal(
        Number(web3.eth.getBalance(simpleAdj.address)),
        bobBal,
        "Funds were not deposited in the SimpleAdjudicator"
      );
      assert.equal(
        Number(web3.eth.getBalance(bob)),
        START_BALANCE - bobBal,
        "Funds were not deposited from bob"
      );
      assert.equal(
        Number(web3.eth.getBalance(alice)),
        START_BALANCE,
        "Funds were deposited from alice"
      );

      aliceState.stateType = State.StateTypes.CONCLUDE;
      bobState.stateType = State.StateTypes.CONCLUDE;

      [r0, s0, v0] = aliceState.sign(alice);
      [r1, s1, v1] = bobState.sign(bob);

      await simpleAdj.conclude(aliceState.toHex(), bobState.toHex(), [v0, v1], [r0, r1], [s0, s1] );
      await simpleAdj.withdraw(bob);

      assert.equal(
        Number(web3.eth.getBalance(bob)),
        START_BALANCE - bobBal,
        "Bob took alice's money."
      );

      await simpleAdj.withdraw(alice);
      assert.equal(
        Number(web3.eth.getBalance(alice)),
        START_BALANCE + bobBal,
        "Alice's balance resolved incorrectly after her withdrawal."
      );

      assert.equal(
        web3.eth.getBalance(simpleAdj.address),
        0,
        "SimpleAdjudicator wasn't emptied"
      );
    });
  });
});
