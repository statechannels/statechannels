import { sha3 } from 'web3-utils';

import { toHex32 } from './utils';
import { Channel } from './channel';

class State {
  channel: any;
  stateType: State.StateType
  turnNum: number;
  resolution: number[];
  stateCount: number;

  constructor({channel, stateType, turnNum, resolution, stateCount=0}: 
    {
      channel: Channel, 
      stateType: State.StateType,
      turnNum: number,
      resolution: number[],
      stateCount?: number,
    }
  ) {
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
    const digest = sha3(this.toHex(), {encoding: 'hex'});
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

module State {
  export enum StateType {
    PreFundSetup,
    PostFundSetup,
    Game,
    Conclude,
  }
}

export { State };
