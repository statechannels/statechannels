import { Channel } from './channel';
import abi from 'web3-eth-abi';
import { utils } from 'ethers';

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
    "gameAttributes": "bytes",
  },
};

export interface BaseCommitment {
  channel: Channel;
  turnNum: utils.BigNumber;
  allocation: utils.BigNumber[];
  destination: string[];
  commitmentCount: utils.BigNumber;
}

export interface Commitment extends BaseCommitment {
  commitmentType: CommitmentType;
  gameAttributes: string;
}

export function toHex(Commitment: Commitment): string {
  return abi.encodeParameter(SolidityCommitmentType, ethereumArgs(Commitment));
}
export function fromHex(Commitment: string): Commitment {
  const parameters = abi.decodeParameter(SolidityCommitmentType, Commitment);
  const channel = new Channel(parameters[0], utils.bigNumberify(parameters[1]), parameters[3]);

  return {
    channel,
    commitmentType: Number.parseInt(parameters[4], 10) as CommitmentType,
    turnNum: utils.bigNumberify(parameters[5]),
    commitmentCount: utils.bigNumberify(parameters[6]),
    destination: parameters[7],
    allocation: parameters[8].map(utils.bigNumberify),
    gameAttributes: parameters[9],
  };
}
export function mover(Commitment: Commitment) {
  return Commitment.channel.participants[this.turnNum % this.numberOfParticipants];
}

export function ethereumArgs(Commitment: Commitment) {
  return [
    Commitment.channel.channelType,
    Commitment.channel.channelNonce,
    Commitment.channel.participants.length,
    Commitment.channel.participants,
    Commitment.commitmentType,
    Commitment.turnNum,
    Commitment.commitmentCount,
    Commitment.destination.map(String),
    Commitment.allocation,
    Commitment.gameAttributes,
  ];
}

export function asEthersObject(Commitment: Commitment) {
  return {
    channelType: Commitment.channel.channelType,
    channelNonce: utils.bigNumberify(Commitment.channel.channelNonce),
    numberOfParticipants: utils.bigNumberify(Commitment.channel.participants.length),
    participants: Commitment.channel.participants,
    commitmentType: Commitment.commitmentType,
    turnNum: utils.bigNumberify(Commitment.turnNum),
    commitmentCount: utils.bigNumberify(Commitment.commitmentCount),
    destination: Commitment.destination,
    allocation: Commitment.allocation.map(x => utils.bigNumberify(String(x))),
    gameAttributes: Commitment.gameAttributes,
  };
}

export enum CommitmentType {
  PreFundSetup = 0,
  PostFundSetup = 1,
  Game = 2,
  Conclude = 3,
}