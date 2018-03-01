
import assertRevert from './helpers/assertRevert';

var SimpleAdjudicator = artifacts.require("./SimpleAdjudicator.sol");

contract('SimpleAdjudicator', (accounts) => {




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


function pack(stateType, aBal, bBal, stake, aPreCommit, bPlay, aPlay, aSalt) {
  return (
    "0x" +
    toHex32(stateType) +
    toHex32(aBal) +
    toHex32(bBal) +
    toHex32(stake) +
    padBytes32(aPreCommit).substr(2, 66) +
    toHex32(bPlay) +
    toHex32(aPlay) +
    toHex32(aSalt)
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
