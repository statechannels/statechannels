import { toHex32, padBytes32 } from './utils';

export function pack(
  channelType,
  channelNonce,
  stateNonce,
  participantA,
  participantB,
  gameState
) {
  let stateType = 0; // for time being
  return (
    "0x" +
    padBytes32(channelType).substr(2, 66) +
    toHex32(channelNonce) +
    toHex32(stateType) +
    toHex32(stateNonce) +
    toHex32(2) +
    padBytes32(participantA).substr(2, 66) +
    padBytes32(participantB).substr(2, 66) +
    gameState.substr(2)
  );
}

export function channelId(channelType, channelNonce, participants) {
  let string = (
    channelType.slice(2) +
    toHex32(channelNonce) +
    participants
  );

  // return web3.sha3(string, {encoding: 'hex'});
  // TODO: fix this!!
  return padBytes32("0xaaa");
}

export function ecSignState(state, account) {
  let digest = hash(state);
  const sig = web3.eth.sign(account, digest).slice(2);
  const r = `0x${sig.slice(0, 64)}`;
  const s = `0x${sig.slice(64, 128)}`;
  const v = web3.toDecimal(sig.slice(128, 130)) + 27;

  return [ r, s, v ];
}

export function hash(bytes) {
  return web3.sha3(bytes, {encoding: 'hex'}).slice(2);
}
