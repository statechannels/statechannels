import { Channel } from './channel';
import abi from 'web3-eth-abi';
import { BigNumberish } from './types';

const SolidityCommitmentType = {
  "CommitmentStruct": {
    "channelType": "address",
    "channelNonce": "uint256",
    "numberOfParticipants": "uint256",
    "participants": "address[]",
    "commitmentType": "uint8",
    "turnNum": "uint256",
    "commitmentCount": "uint256",
    "destination": "address[]",
    "allocation": "uint256[]",
    "appAttributes": "bytes",
  },
};

export interface BaseCommitment {
  channel: Channel;
  turnNum: BigNumberish;
  allocation: BigNumberish[];
  destination: string[];
  commitmentCount: BigNumberish;
}

export interface Commitment extends BaseCommitment {
  commitmentType: CommitmentType;
  appAttributes: string;
}

export function toHex(commitment: Commitment): string {
  return abi.encodeParameter(SolidityCommitmentType, ethereumArgs(commitment));
}
export function fromHex(commitment: string): Commitment {
  const parameters = abi.decodeParameter(SolidityCommitmentType, commitment);
  const channel = {
    channelType: parameters[0],
    channelNonce: parameters[1],
    participants: parameters[3],
  };

  return {
    channel,
    commitmentType: Number.parseInt(parameters[4], 10) as CommitmentType,
    turnNum: parameters[5],
    commitmentCount: parameters[6],
    destination: parameters[7],
    allocation: parameters[8],
    appAttributes: parameters[9],
  };
}
export function mover(commitment: Commitment) {
  return commitment.channel.participants[this.turnNum % this.numberOfParticipants];
}

export function ethereumArgs(commitment: Commitment) {
  return [
    commitment.channel.channelType,
    commitment.channel.channelNonce,
    commitment.channel.participants.length,
    commitment.channel.participants,
    commitment.commitmentType,
    commitment.turnNum,
    commitment.commitmentCount,
    commitment.destination.map(String),
    commitment.allocation,
    commitment.appAttributes,
  ];
}

export function asEthersObject(commitment: Commitment) {
  return {
    channelType: commitment.channel.channelType,
    channelNonce: commitment.channel.channelNonce,
    numberOfParticipants: commitment.channel.participants.length,
    participants: commitment.channel.participants,
    commitmentType: commitment.commitmentType,
    turnNum: commitment.turnNum,
    commitmentCount: commitment.commitmentCount,
    destination: commitment.destination,
    allocation: commitment.allocation,
    appAttributes: commitment.appAttributes,
  };
}

export enum CommitmentType {
  PreFundSetup = 0,
  PostFundSetup = 1,
  App = 2,
  Conclude = 3,
}