import { Channel, State, assertRevert, increaseTime, duration } from 'fmg-core';
import { CountingGame } from 'fmg-core/test/test-game/src/counting-game';

var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");
var CommonState = artifacts.require("fmg-core/contracts/CommonState.sol");
var CountingStateContract = artifacts.require("fmg-core/test/test-game/contracts/CountingState.sol");
var CountingGameContract = artifacts.require("fmg-core/test/test-game/contracts/CountingGame.sol");

const START_BALANCE = 100000000000000000000;

const A_IDX = 1;
const B_IDX = 2;
const aBal = Number(web3.toWei(6, "ether"));
const bBal = Number(web3.toWei(4, "ether"));
const resolution = [aBal, bBal];
const differentResolution = [bBal, aBal];

contract('SimpleAdjudicator', (accounts) => {
  let simpleAdj, countingGame;
  let state0, state1, state2, state3, state1alt, state2alt;
  before(async () => {
    CountingStateContract.link(CommonState);
    let stateContract = await CountingStateContract.new();
    CountingGameContract.link("CountingState", stateContract.address);
    let countingGameContract = await CountingGameContract.new();
    let channel = new Channel(countingGameContract.address, 0, [accounts[A_IDX], accounts[B_IDX]]);

    state0 = CountingGame.gameState({channel, resolution, turnNum: 6, gameCounter: 1});
    state1 = CountingGame.gameState({channel, resolution, turnNum: 7, gameCounter: 2});
    state2 = CountingGame.gameState({channel, resolution, turnNum: 8, gameCounter: 3});
    state3 = CountingGame.gameState({channel, resolution, turnNum: 9, gameCounter: 4});

    state1alt = CountingGame.gameState({channel, resolution: differentResolution, turnNum: 7, gameCounter: 2});
    state2alt = CountingGame.gameState({channel, resolution: differentResolution, turnNum: 8, gameCounter: 3});

    simpleAdj = await SimpleAdjudicator.new(channel.id);
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
    await simpleAdj.respondWithMove(responseState.toHex(), v2, r2, s2);
    assert.equal(await simpleAdj.currentChallengePresent(), false);
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

    await simpleAdj.refute(refutationState.toHex(), v2, r2, s2);
    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge wasn't canceled");
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

    await simpleAdj.alternativeRespondWithMove(alternativeState.toHex(), responseState.toHex(), [v2, v3], [r2, r3], [s2, s3]);
    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge not cancelled");
  });

  it("forceMove -> timeout -> withdraw", async () => {
    // fund the contract

    let agreedState = state0;
    let challengeState = state1;

    let challengee = accounts[A_IDX];
    let challenger = accounts[B_IDX];

    let challengeeBal = aBal;
    let challengerBal = bBal;

    let [r0, s0, v0] = agreedState.sign(challengee);
    let [r1, s1, v1] = challengeState.sign(challenger);

    await web3.eth.sendTransaction({
      from: challengee,
      to: simpleAdj.address,
      value: challengeeBal,
      gasPrice: 0
    })

    await web3.eth.sendTransaction({
      from: challenger,
      to: simpleAdj.address,
      value: challengerBal,
      gasPrice: 0
    })

    assert.equal(
      web3.eth.getBalance(simpleAdj.address),
      challengeeBal + challengerBal,
      "Funds were not deposited in the SimpleAdjudicator"
    );
    assert.equal(
      Number(web3.eth.getBalance(challenger)),
      START_BALANCE - challengerBal,
      "Funds were not deposited from the challenger"
    );
    assert.equal(
      Number(web3.eth.getBalance(challengee)),
      START_BALANCE - challengeeBal,
      "Funds were not deposited from the challengee"
    );

    await simpleAdj.forceMove(agreedState.toHex(), challengeState.toHex(), [v0, v1], [r0, r1], [s0, s1] );
    await increaseTime(duration.days(2));
    await simpleAdj.withdraw();

    assert.equal(
      web3.eth.getBalance(simpleAdj.address),
      0,
      "SimpleAdjudicator wasn't emptied"
    );
    assert.equal(
      Number(web3.eth.getBalance(challenger)),
      START_BALANCE,
      "Resolved balances incorrectly."
    );
    assert.equal(
      Number(web3.eth.getBalance(challengee)),
      START_BALANCE,
      "Resolved balances incorrectly."
    );
  });

  // TODO: replace when conclude states are done
  // it("conclude", async () => {
  //   let yourBal = 6;
  //   let myBal = 6;
  //   let count = 1;
  //   let yourState = packIG(0, CONCLUDED, myBal, yourBal, count+1);
  //   let myState = packIG(1, CONCLUDED, myBal, yourBal, count);
  //
  //   let you = accounts[A_IDX];
  //   let me = accounts[B_IDX];
  //
  //   let [r0, s0, v0] = ecSignState(yourState, you);
  //   let [r1, s1, v1] = ecSignState(myState, me);
  //
  //   assert.equal(await simpleAdj.currentChallengePresent(), false, "current challenge exists at start of game");
  //   assert.equal(await simpleAdj.expiredChallengePresent(), false, "expired challenge exists at start of game");
  //
  //   await simpleAdj.conclude(yourState, myState, [v0, v1], [r0, r1], [s0, s1] );
  //
  //   assert.equal(await simpleAdj.currentChallengePresent(), true, "conclude didn't create current challenge");
  //   assert.equal(await simpleAdj.expiredChallengePresent(), true, "conclude did not create expired challenge");
  //   assert.equal(await simpleAdj.activeChallengePresent(), false, "conclude created active challenge");
  // });
});
