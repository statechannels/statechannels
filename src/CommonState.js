import { toHex32, padBytes32 } from './utils';

class Channel {
  constructor(channelType, channelNonce, participants) {
    this.channelType = channelType;
    this.channelNonce = channelNonce;
    this.participants = participants;
  }

  numberOfParticipants() {
    return this.participants.length;
  }

  toHex() {
    return (
      padBytes32(this.channelType) +
      toHex32(this.channelNonce).substr(2) +
      toHex32(this.numberOfParticipants()).substr(2) +
      this.participants.map(x => padBytes32(x).substr(2)).join("")
    )
  }
}

class State {
  constructor(channel, stateType, turnNum, position) {
    this.channel = channel;
    this.stateType = stateType;
    this.turnNum = turnNum;
    this.position = position;
  }
}

export function pack(
  channelType,
  channelNonce,
  stateNonce,
  participantA,
  participantB,
  gameState
) {
  let channel = new Channel(channelType, channelNonce, [participantA, participantB]);
  let stateType = 0; // for time being
  return (
    channel.toHex() +
    toHex32(stateType).substr(2) +
    toHex32(stateNonce).substr(2) +
    gameState.substr(2)
  );
}

export function channelId(channelType, channelNonce, participants) {
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
