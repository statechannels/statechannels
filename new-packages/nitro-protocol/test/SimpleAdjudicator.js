import { Position as CountingPosition } from '../src/CountingGame';
import { Channel, State } from '../src/CommonState';

import assertRevert from './helpers/assertRevert';
import { default as increaseTime, duration } from './helpers/increaseTime';

var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");
var CountingGame = artifacts.require("./CountingGame.sol");

const START_BALANCE = 100000000000000000000;

const A_IDX = 1;
const B_IDX = 2;

contract('SimpleAdjudicator', (accounts) => {
  let simpleAdj, countingGame, packIG;
  let state0, state1, state2, state3, state1alt, state2alt;
  let challengerBal, challengeeBal;
  before(async () => {
    countingGame = await CountingGame.deployed();

    let channel = new Channel(countingGame.address, 0, [accounts[A_IDX], accounts[B_IDX]]);

    challengeeBal = Number(web3.toWei(6, "ether"));
    challengerBal = Number(web3.toWei(4, "ether"));
    let startPosition = CountingPosition.initialPosition(challengeeBal, challengerBal);
    state0 = new State(channel, State.StateTypes.GAME, 0, startPosition);
    state1 = state0.next(state0.position.next());
    state2 = state1.next(state1.position.next());
    state3 = state2.next(state2.position.next());

    let pos1alt = new CountingPosition(3, 6, 1);

    state1alt = new State(channel, State.StateTypes.GAME, 1, pos1alt);
    state2alt = state1alt.next(state1alt.position.next());

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
