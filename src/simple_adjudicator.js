
import { toHex32, padBytes32 } from './utils';

export function packChannel(channelType, participantA, participantB, channelNonce) {
  return (
    "0x" +
    padBytes32(channelType) +
    padBytes32(participantA) +
    padBytes32(participantB) +
    toHex32(channelNonce)
  );
}

export function packState(channelId, stateNonce, lastMover, gameState) {
  return(
    "0x" +
    padBytes32(channelId).substr(2, 66) +
    toHex32(stateNonce) +
    padBytes32(lastMover).substr(2, 66) +
    gameState.substr(2)
  )
}

export function packGS(aBal) {
  return (
    "0x" +
    toHex32(aBal)
  );
}

export function calculateChannelId(channelType, aAddress, bAddress, channelNonce) {
  let string = (
    channelType.slice(2) +
    aAddress.slice(2) +
    bAddress.slice(2) +
    toHex32(channelNonce)
  );

  return web3.sha3(string, {encoding: 'hex'});
}

export function hash(bytes) {
  return web3.sha3(bytes, {encoding: 'hex'}).slice(2);
}

export function ecsign(digest, account) {
    const sig = web3.eth.sign(account, digest).slice(2);
    const r = `0x${sig.slice(0, 64)}`;
    const s = `0x${sig.slice(64, 128)}`;
    const v = web3.toDecimal(sig.slice(128, 130)) + 27;

    return [ r, s, v ];
}
