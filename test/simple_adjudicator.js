
import assertRevert from './helpers/assertRevert';

var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");
var StartFinishGame = artifacts.require("./StartFinishGame.sol");

contract('SimpleAdjudicator', (accounts) => {
  let simpleAdj, sfGame;
  before(async () => {
    simpleAdj = await SimpleAdjudicator.deployed();
    sfGame = await StartFinishGame.deployed();
  });

  it("testGameStateExtraction", async () => {
    let gameState = packStartFinish(0, 4, 6);
    let state = packState(2, "0xdeadbeef", gameState);

    let returnedGameState = await simpleAdj.testGameStateExtraction.call(state);

    assert.equal(returnedGameState, gameState);
  });

  it("testDelegation", async () => {
    let gameState = packStartFinish(0, 4, 6);
    let state = packState(2, "0xdeadbeef", gameState);

    let [aBal, bBal] = await simpleAdj.testDelegation.call(sfGame.address, state);
    
    assert.equal(aBal, 4);
  });
});

function packChannel(channelType, participantA, participantB, channelNonce) {
  return (
    "0x" +
    padBytes32(channelType) +
    padBytes32(participantA) +
    padBytes32(participantB) +
    toHex32(channelNonce)
  );
}

function packStartFinish(stateType, aBal, bBal) {
  return (
    "0x" +
    toHex32(stateType) +
    toHex32(aBal) +
    toHex32(bBal)
  );
}

function packState(nonce, lastMover, gameState) {
  return(
    "0x" +
    toHex32(nonce) +
    padBytes32(lastMover).substr(2, 66) +
    gameState.substr(2, gameState.length)
  )
}

function packGS(aBal) {
  return (
    "0x" +
    toHex32(aBal)
  );
}

function hashCommitment(play, salt) {
  let paddedPlay = toHex32(play);
  let paddedSalt = toHex32(salt);
  return web3.sha3(paddedPlay + paddedSalt, {encoding: 'hex'}); // concat and hash
}

function toHex32(num) {
  return toPaddedHexString(num, 64);
}

function padBytes32(data){
  let l = 66-data.length
  let x = data.substr(2, data.length)

  for(var i=0; i<l; i++) {
    x = 0 + x
  }
  return '0x' + x
}

// https://stackoverflow.com/a/42203200
function toPaddedHexString(num, len) {
    let str = num.toString(16);
    return "0".repeat(len - str.length) + str;
}
