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

export interface BaseState {
  channel: Channel;
  turnNum: utils.BigNumber;
  allocation: utils.BigNumber[];
  destination: string[];
  stateCount: utils.BigNumber;
}

export interface State extends BaseState {
  stateType: StateType;
  gameAttributes: string;
}

export function toHex(state: State): string {
  return abi.encodeParameter(SolidityStateType, ethereumArgs(state));
}
export function fromHex(state: string): State {
  const parameters = abi.decodeParameter(SolidityStateType, state);
  const channel = new Channel(parameters[0], utils.bigNumberify(parameters[1]), parameters[3]);

  return {
    channel,
    stateType: Number.parseInt(parameters[4], 10) as StateType,
    turnNum: utils.bigNumberify(parameters[5]),
    stateCount: utils.bigNumberify(parameters[6]),
    destination: parameters[7],
    allocation: parameters[8].map(utils.bigNumberify),
    gameAttributes: parameters[9],
  };
}
export function mover(state: State) {
  return state.channel.participants[this.turnNum % this.numberOfParticipants];
}

export function ethereumArgs(state: State) {
  return [
    state.channel.channelType,
    state.channel.channelNonce,
    state.channel.participants.length,
    state.channel.participants,
    state.stateType,
    state.turnNum,
    state.stateCount,
    state.destination.map(String),
    state.allocation,
    state.gameAttributes,
  ];
}

export function asEthersObject(state: State) {
  return {
    channelType: state.channel.channelType,
    channelNonce: utils.bigNumberify(state.channel.channelNonce),
    numberOfParticipants: utils.bigNumberify(state.channel.participants.length),
    participants: state.channel.participants,
    stateType: state.stateType,
    turnNum: utils.bigNumberify(state.turnNum),
    stateCount: utils.bigNumberify(state.stateCount),
    destination: state.destination,
    allocation: state.allocation.map(x => utils.bigNumberify(String(x))),
    gameAttributes: state.gameAttributes,
  };
}

export enum StateType {
  PreFundSetup = 0,
  PostFundSetup = 1,
  Game = 2,
  Conclude = 3,
}