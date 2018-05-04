import { pack as packIGState } from '../src/CountingGame';
import { ecSignState, channelId } from '../src/CommonState';
import assertRevert from './helpers/assertRevert';
import { default as increaseTime, duration } from './helpers/increaseTime';

var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");
var CountingGame = artifacts.require("./CountingGame.sol");

const START_BALANCE = 100000000000000000000;

const START = 0;
const CONCLUDED = 1;
const A_IDX = 1;
const B_IDX = 2;

contract('SimpleAdjudicator', (accounts) => {
  let simpleAdj, incGame, packIG;
  before(async () => {
    incGame = await CountingGame.deployed();

    let id = channelId(incGame.address, 0, [accounts[A_IDX], accounts[B_IDX]]);
    simpleAdj = await SimpleAdjudicator.new(id);

    packIG = (stateNonce, stateType, aBal, bBal, count) => {
      return packIGState(
        incGame.address, 0, accounts[A_IDX], accounts[B_IDX],
        stateNonce, stateType, aBal, bBal, count
      );
    };
  });

  it("forceMove -> respondWithMove", async () => {
    let agreedState = packIG(0, START, 4, 6, 1);
    let challengeState = packIG(1, START, 4, 6, 2);
    let responseState = packIG(2, CONCLUDED, 4, 6, 3);

    let challenger = accounts[B_IDX];
    let challengee = accounts[A_IDX];

    let [r0, s0, v0] = ecSignState(agreedState, challengee);
    let [r1, s1, v1] = ecSignState(challengeState, challenger);

    assert.equal(await simpleAdj.currentChallengePresent(), false);

    await simpleAdj.forceMove(agreedState, challengeState, [v0, v1], [r0, r1], [s0, s1] );
    assert.equal(await simpleAdj.currentChallengePresent(), true);

    let [r2, s2, v2] = ecSignState(responseState, challengee);
    await simpleAdj.respondWithMove(responseState, v2, r2, s2);
    assert.equal(await simpleAdj.currentChallengePresent(), false);
  });

  it("forceMove -> refute", async () => {
    let agreedState = packIG(0, START, 4, 6, 1);
    let challengeState = packIG(1, START, 4, 6, 2);
    let refutationState = packIG(3, CONCLUDED, 4, 6, 3);

    let challenger = accounts[B_IDX];
    let challengee = accounts[A_IDX];

    let [r0, s0, v0] = ecSignState(agreedState, challengee);
    let [r1, s1, v1] = ecSignState(challengeState, challenger);

    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge exists at start of game");

    await simpleAdj.forceMove(agreedState, challengeState, [v0, v1], [r0, r1], [s0, s1] );
    assert.equal(await simpleAdj.currentChallengePresent(), true, "challenge wasn't created");

    // refute
    let [r2, s2, v2] = ecSignState(refutationState, challenger);

    await simpleAdj.refute(refutationState, v2, r2, s2);
    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge wasn't canceled");
  });

  it("forceMove -> alternativeRespondWithMove", async () => {
    let agreedState = packIG(0, START, 4, 6, 1);
    let challengeState = packIG(1, START, 4, 6, 2);
    let alternativeState = packIG(1, START, 5, 5, 2);
    let responseState = packIG(2, CONCLUDED, 5, 5, 3);

    let challenger = accounts[B_IDX];
    let challengee = accounts[A_IDX];

    let [r0, s0, v0] = ecSignState(agreedState, challengee);
    let [r1, s1, v1] = ecSignState(challengeState, challenger);

    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge exists at start of game");

    await simpleAdj.forceMove(agreedState, challengeState, [v0, v1], [r0, r1], [s0, s1] );
    assert.equal(await simpleAdj.currentChallengePresent(), true, "challenge not created");

    let [r2, s2, v2] = ecSignState(alternativeState, challenger);
    let [r3, s3, v3] = ecSignState(responseState, challengee);

    await simpleAdj.alternativeRespondWithMove(alternativeState, responseState, [v2, v3], [r2, r3], [s2, s3]);
    assert.equal(await simpleAdj.currentChallengePresent(), false, "challenge not cancelled");
  });

  it("forceMove -> timeout -> withdraw", async () => {
    // fund the contract
    let challengeeBal = Number(web3.toWei(6, "ether"));
    let challengerBal = Number(web3.toWei(4, "ether"));

    let agreedState = packIG(0,    START, challengeeBal, challengerBal, 1);
    let challengeState = packIG(1, START, challengeeBal, challengerBal, 2);

    let challengee = accounts[A_IDX];
    let challenger = accounts[B_IDX];

    let [r0, s0, v0] = ecSignState(agreedState,    challengee);
    let [r1, s1, v1] = ecSignState(challengeState, challenger);

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

    await simpleAdj.forceMove(agreedState, challengeState, [v0, v1], [r0, r1], [s0, s1] );
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

  it("conclude", async () => {
    let yourBal = 6;
    let myBal = 6;
    let count = 1;
    let yourState = packIG(0, CONCLUDED, myBal, yourBal, count+1);
    let myState = packIG(1, CONCLUDED, myBal, yourBal, count);

    let you = accounts[A_IDX];
    let me = accounts[B_IDX];

    let [r0, s0, v0] = ecSignState(yourState, you);
    let [r1, s1, v1] = ecSignState(myState, me);

    await simpleAdj.conclude(yourState, myState, [v0, v1], [r0, r1], [s0, s1] );
  });
});
