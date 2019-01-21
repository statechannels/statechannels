import { Channel } from './channel';
import abi from 'web3-eth-abi';
import { utils } from 'ethers';

const SolidityStateType = {
  "StateStruct": {
    "channelType": "address",
    "channelNonce": "uint256",
    "numberOfParticipants": "uint256",
    "participants": "address[]",
    "stateType": "uint8",
    "turnNum": "uint256",
    "stateCount": "uint256",
    "destination": "address[]",
    "allocation": "uint256[]",
    "gameAttributes": "bytes",
  },
};

class State {
  channel: Channel;
  stateType: State.StateType;
  turnNum: number;
  allocation: utils.BigNumber[];
  destination: string[];
  stateCount: number;

  constructor({channel, stateType, turnNum, allocation, destination, stateCount=0}: 
    {
      channel: Channel, 
      stateType: State.StateType,
      turnNum: number,
      allocation: utils.BigNumber[],
      destination: string[],
      stateCount?: number,
    }
  ) {
    this.channel = channel;
    this.stateType = stateType;
    this.turnNum = turnNum;
    this.allocation = allocation;
    this.destination = destination;
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
      this.destination.map(String),
      this.allocation,
      this.gameAttributes,
    ];
  }

  get asEthersObject() {
    return { 
      channelType: this.channel.channelType,
      channelNonce: utils.bigNumberify(this.channel.channelNonce),
      numberOfParticipants: utils.bigNumberify(this.numberOfParticipants),
      participants: this.channel.participants,
      stateType: this.stateType,
      turnNum: utils.bigNumberify(this.turnNum),
      stateCount: utils.bigNumberify(this.stateCount),
      destination: this.destination,
      allocation: this.allocation.map(x => utils.bigNumberify(String(x))),
      gameAttributes: this.gameAttributes,
  };
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