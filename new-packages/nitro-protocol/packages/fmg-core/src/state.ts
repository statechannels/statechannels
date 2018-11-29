import { Channel } from './channel';
import BN from 'bn.js';
import abi from 'web3-eth-abi';

const SolidityStateType = {
  "StateStruct": {
    "channelType": "address",
    "channelNonce": "uint256",
    "numberOfParticipants": "uint256",
    "participants": "address[]",
    "stateType": "uint8",
    "turnNum": "uint256",
    "stateCount": "uint256",
    "resolution": "uint256[]",
    "gameAttributes": "bytes",
  },
};

class State {
  channel: Channel;
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

  equals(other: State): boolean {
    return this.toHex().toLowerCase() === other.toHex().toLowerCase();
  }

  toHex() {
    return abi.encodeParameter(SolidityStateType, this.args);
  }

  get numberOfParticipants() {
    return this.channel.numberOfParticipants;
  }

  get gameAttributes() {
    return "0x";
  }

  get mover() {
    return this.channel.participants[this.turnNum % this.numberOfParticipants];
  }

  get args() {
    return [
      this.channel.channelType,
      this.channel.channelNonce,
      this.numberOfParticipants,
      this.channel.participants,
      this.stateType,
      this.turnNum,
      this.stateCount,
      this.resolution.map(String),
      this.gameAttributes,
    ];
  }
}

// tslint:disable-next-line:no-namespace
namespace State {
  export enum StateType {
    PreFundSetup = 0,
    PostFundSetup = 1,
    Game = 2,
    Conclude = 3,
  }
}

export { State };