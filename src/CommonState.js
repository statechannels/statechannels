import { toHex32, padBytes32 } from './utils';
import { soliditySha3 } from 'web3-utils';

class Channel {
  constructor(channelType, channelNonce, participants) {
    this.channelType = channelType;
    this.channelNonce = channelNonce;
    this.participants = participants;
  }

  get numberOfParticipants() {
    return this.participants.length;
  }

  get id() {
    return soliditySha3(
      { type: 'address', value: this.channelType },
      { type: 'uint256', value: this.channelNonce },
      { type: 'address[]', value: this.participants },
    );
  }

  toHex() {
    return (
      padBytes32(this.channelType) +
      toHex32(this.channelNonce).substr(2) +
      toHex32(this.numberOfParticipants).substr(2) +
      this.participants.map(x => padBytes32(x).substr(2)).join("")
    )
  }
}

class State {
  constructor({channel, stateType, turnNum, resolution, stateCount}) {
    this.channel = channel;
    this.stateType = stateType;
    this.turnNum = turnNum;
    this.resolution = resolution;
    this.stateCount = stateCount || 0;
  }

  toHex() {
    return (
      this.channel.toHex() +
      toHex32(this.stateType).substr(2) +
      toHex32(this.turnNum).substr(2) +
      toHex32(this.stateCount).substr(2) +
      this.resolution.map(x => toHex32(x).substr(2)).join("")
    )
  }

  sign(account) {
    const digest = web3.sha3(this.toHex(), {encoding: 'hex'}).substr(2);
    const sig = web3.eth.sign(account, digest).slice(2);
    const r = `0x${sig.slice(0, 64)}`;
    const s = `0x${sig.slice(64, 128)}`;
    const v = web3.toDecimal(sig.slice(128, 130)) + 27;

    return [ r, s, v ];
  }

  next(newPosition) {
    return new State(this.channel, this.stateType, this.turnNum + 1, newPosition);
  }
}

State.StateTypes = {
  PROPOSE: 0,
  ACCEPT: 1,
  GAME: 2,
  CONCLUDE: 3,
}

Object.freeze(State.StateTypes);

export { Channel, State };
