import { pack as packIG } from '../src/incrementation_game';
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

contract('SimpleAdjudicator', (accounts) => {
  let simpleAdj, incGame;
  before(async () => {
    simpleAdj = await SimpleAdjudicator.deployed();
    incGame = await IncrementationGame.deployed();
  });

  // testing ForceMove
  it("allows a valid force move", async () => {
    let state1 = packIG(0, 4, 6, 1);
    let state2 = packIG(0, 4, 6, 2);
    let state3 = packIG(1, 4, 6, 3);

    let challenger = accounts[0];
    let challengee = accounts[1];

    let channelId = calculateChannelId(incGame.address, challenger, challengee, 1);

    let agreedState = packState(channelId, 1, challengee, state1);
    let challengersState = packState(channelId, 2, challenger, state2);

    let [r0, s0, v0] = ecsign(hash(agreedState), challengee);
    let [r1, s1, v1] = ecsign(hash(agreedState), challenger);
    let [r2, s2, v2] = ecsign(hash(challengersState), challenger);

    simpleAdj.forceMove(
      incGame.address, [challenger, challengee], 0, 1, // channel
      agreedState, challengersState, // states
      [v0, v1, v2], [r0, r1, r2], [s0, s1, s2] // sigs
    );
    // how can I check on the state of the contract?
    console.log(simpleAdj.currentChallenge);

    // testing respondWithMove
    let responseState = packState(channelId, 3, challenger, state3);
    let [r3, s3, v3] = ecsign(hash(responseState), challengee);

    simpleAdj.respondWithMove(responseState, v3, r3, s3);
    //todo: check this did somethign


  });

});
