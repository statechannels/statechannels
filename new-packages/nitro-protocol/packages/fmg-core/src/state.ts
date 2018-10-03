import { toHex32 } from './utils';
import { Channel } from './channel';
import BN from 'bn.js';

class State {
  channel: any;
  stateType: State.StateType;
  turnNum: number;
  resolution: BN[];
  stateCount: number;

  constructor({channel, stateType, turnNum, resolution, stateCount=0}: 
    {
      channel: Channel, 
      stateType: State.StateType,
      turnNum: number,
      resolution: BN[],
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
    );
  }

  get numberOfParticipants() {
    return this.channel.numberOfParticipants;
  }

  get mover() {
    return this.channel.participants[this.turnNum % this.numberOfParticipants];
  }
}

// tslint:disable-next-line:no-namespace
namespace State {
  export enum StateType {
    PreFundSetup,
    PostFundSetup,
    Game,
    Conclude,
  }
}

export { State };