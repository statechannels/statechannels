import { pack as packIGState } from '../src/CountingGame';
import { ecSignState, channelId } from '../src/CommonState';
import assertRevert from './helpers/assertRevert';
import { default as increaseTime, duration } from './helpers/increaseTime';

var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");
var CountingGame = artifacts.require("./CountingGame.sol");

const START = 0;
const FINAL = 1;

contract('SimpleAdjudicator', (accounts) => {
  let simpleAdj, incGame, packIG;
  before(async () => {
    incGame = await CountingGame.deployed();

    let id = channelId(incGame.address, 0, [accounts[0], accounts[1]]);
    simpleAdj = await SimpleAdjudicator.new(id);

    packIG = (stateNonce, stateType, aBal, bBal, points) => {
      return packIGState(
        incGame.address, 0, accounts[0], accounts[1],
        stateNonce, stateType, aBal, bBal, points
      );
    };
  });

  it("forceMove -> respondWithMove", async () => {
    let agreedState = packIG(0, START, 4, 6, 1);
    let challengeState = packIG(1, START, 4, 6, 2);
    let responseState = packIG(2, FINAL, 4, 6, 3);

    let challenger = accounts[1];
    let challengee = accounts[0];

    let [r0, s0, v0] = ecSignState(agreedState, challengee);
    let [r1, s1, v1] = ecSignState(challengeState, challenger);

    await simpleAdj.forceMove(agreedState, challengeState, [v0, v1], [r0, r1], [s0, s1] );
    // how can I check on the state of the contract?
    // console.log(simpleAdj.currentChallenge);

    // testing respondWithMove
    let [r2, s2, v2] = ecSignState(responseState, challengee);

    await simpleAdj.respondWithMove(responseState, v2, r2, s2);
  });

  it("forceMove -> refute", async () => {
    let agreedState = packIG(0, START, 4, 6, 1);
    let challengeState = packIG(1, START, 4, 6, 2);
    let refutationState = packIG(3, FINAL, 4, 6, 3);

    let challenger = accounts[1];
    let challengee = accounts[0];

    let [r0, s0, v0] = ecSignState(agreedState, challengee);
    let [r1, s1, v1] = ecSignState(challengeState, challenger);

    await simpleAdj.forceMove(agreedState, challengeState, [v0, v1], [r0, r1], [s0, s1] );
    // how can I check on the state of the contract?
    // console.log(simpleAdj.currentChallenge);

    // refute
    let [r2, s2, v2] = ecSignState(refutationState, challenger);

    await simpleAdj.refuteChallenge(refutationState, v2, r2, s2);
  });

  it("forceMove -> respondWithAlternativeMove", async () => {
    let agreedState = packIG(0, START, 4, 6, 1);
    let challengeState = packIG(1, START, 4, 6, 2);
    let alternativeState = packIG(1, START, 5, 5, 2);
    let responseState = packIG(2, FINAL, 5, 5, 3);

    let challenger = accounts[1];
    let challengee = accounts[0];

    let [r0, s0, v0] = ecSignState(agreedState, challengee);
    let [r1, s1, v1] = ecSignState(challengeState, challenger);

    await simpleAdj.forceMove(agreedState, challengeState, [v0, v1], [r0, r1], [s0, s1] );

    let [r2, s2, v2] = ecSignState(alternativeState, challenger);
    let [r3, s3, v3] = ecSignState(responseState, challengee);

    await simpleAdj.respondWithAlternativeMove(alternativeState, responseState, [v2, v3], [r2, r3], [s2, s3]);
  });

  it("forceMove -> timeout -> withdrawFunds", async () => {
    // fund the contract
    await simpleAdj.send(web3.toWei(10, "ether"));

    let agreedState = packIG(0, START, 4, 6, 1);
    let challengeState = packIG(1, START, 4, 6, 2);

    let challenger = accounts[1];
    let challengee = accounts[0];

    let [r0, s0, v0] = ecSignState(agreedState, challengee);
    let [r1, s1, v1] = ecSignState(challengeState, challenger);

    await simpleAdj.forceMove(agreedState, challengeState, [v0, v1], [r0, r1], [s0, s1] );

    await increaseTime(duration.days(2));

    // TODO: make this work
    await simpleAdj.withdrawFunds()
  });

});
