import { pack as packIGState } from '../src/incrementation_game';
import { ecSignState } from '../src/CommonState';
import {
  calculateChannelId,
  hash,
  ecsign,
  packChannel,
  packState,
  packGS
} from '../src/simple_adjudicator';
import assertRevert from './helpers/assertRevert';

var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");
var IncrementationGame = artifacts.require("./IncrementationGame.sol");

const START = 0;
const FINAL = 1;

contract('SimpleAdjudicator', (accounts) => {
  let simpleAdj, incGame, packIG;
  before(async () => {
    simpleAdj = await SimpleAdjudicator.deployed();
    incGame = await IncrementationGame.deployed();

    packIG = (stateNonce, stateType, aBal, bBal, points) => {
      return packIGState(
        incGame.address, 0, accounts[0], accounts[1],
        stateNonce, stateType, aBal, bBal, points
      );
    };
  });

  // testing ForceMove
  it("allows a valid force move", async () => {
    let agreedState = packIG(0, START, 4, 6, 1);
    let challengeState = packIG(1, START, 4, 6, 2);
    let responseState = packIG(2, FINAL, 4, 6, 3);

    let challenger = accounts[1];
    let challengee = accounts[0];

    let [r0, s0, v0] = ecSignState(agreedState, challengee);
    let [r1, s1, v1] = ecSignState(challengeState, challenger);

    simpleAdj.forceMove(agreedState, challengeState, [v0, v1], [r0, r1], [s0, s1] );
    // how can I check on the state of the contract?
    // console.log(simpleAdj.currentChallenge);

    // testing respondWithMove
    let [r2, s2, v2] = ecSignState(responseState, challengee);

    simpleAdj.respondWithMove(responseState, v2, r2, s2);
    //todo: check this did somethign


  });

});
