import { toHex32, padBytes32 } from './utils';

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

  get numberOfParticipants() {
    return this.channel.numberOfParticipants;
  }

  get mover() {
    return this.channel.participants[this.turnNum % this.numberOfParticipants];
  }
}

State.StateTypes = {
  PREFUNDSETUP: 0,
  POSTFUNDSETUP: 1,
  GAME: 2,
  CONCLUDE: 3,
}

Object.freeze(State.StateTypes);

export { State };
