import {Channel} from './channel';
import abi from 'web3-eth-abi';
import {Uint32, Uint256, Address, Bytes} from './types';
import {bigNumberify} from 'ethers/utils';
import {ADDRESS_ZERO} from '.';

const SolidityCommitmentType = {
  CommitmentStruct: {
    channelType: 'address',
    nonce: 'uint32',
    participants: 'address[]',
    guaranteedChannel: 'address',
    commitmentType: 'uint8',
    turnNum: 'uint32',
    commitmentCount: 'uint32',
    destination: 'address[]',
    allocation: 'uint256[]',
    token: 'address[]',
    appAttributes: 'bytes',
  },
};

export interface BaseCommitment {
  channel: Channel;
  turnNum: Uint32;
  allocation: Uint256[];
  destination: Address[];
  commitmentCount: Uint32;
  token: Address[];
}

export interface Commitment extends BaseCommitment {
  commitmentType: CommitmentType;
  appAttributes: Bytes;
}

export function toHex(commitment: Commitment): string {
  return abi.encodeParameter(SolidityCommitmentType, ethereumArgs(commitment));
}

export function fromHex(commitment: string): Commitment {
  const parameters = abi.decodeParameter(SolidityCommitmentType, commitment);
  return fromParameters(parameters);
}

export function fromParameters(parameters: any[]): Commitment {
  let idx = -1;
  // Incrementing the idx variable works as long as the parameters are parsed in the
  // same order as the commitment struct defines them
  const channel = {
    channelType: parameters[(idx += 1)],
    nonce: Number.parseInt(parameters[(idx += 1)], 10),
    participants: parameters[(idx += 1)],
    guaranteedChannel: parameters[(idx += 1)],
  };

  return {
    channel,
    commitmentType: Number.parseInt(parameters[(idx += 1)], 10) as CommitmentType,
    turnNum: Number.parseInt(parameters[(idx += 1)], 10),
    commitmentCount: Number.parseInt(parameters[(idx += 1)], 10),
    destination: parameters[(idx += 1)],
    allocation: parameters[(idx += 1)].map(a => bigNumberify(a).toHexString()),
    token: parameters[(idx += 1)],
    appAttributes: parameters[(idx += 1)],
  };
}

export function mover(commitment: Commitment) {
  return commitment.channel.participants[
    commitment.turnNum % commitment.channel.participants.length
  ];
}

export function ethereumArgs(commitment: Commitment) {
  return [
    commitment.channel.channelType,
    commitment.channel.nonce,
    commitment.channel.participants,
    commitment.channel.guaranteedChannel || ADDRESS_ZERO,
    commitment.commitmentType,
    commitment.turnNum,
    commitment.commitmentCount,
    commitment.destination,
    commitment.allocation,
    commitment.token,
    commitment.appAttributes,
  ];
}

export function asEthersObject(commitment: Commitment) {
  return {
    channelType: commitment.channel.channelType,
    nonce: commitment.channel.nonce,
    participants: commitment.channel.participants,
    guaranteedChannel: commitment.channel.guaranteedChannel || ADDRESS_ZERO,
    commitmentType: commitment.commitmentType,
    turnNum: commitment.turnNum,
    commitmentCount: commitment.commitmentCount,
    destination: commitment.destination,
    allocation: commitment.allocation,
    token: commitment.token,
    appAttributes: commitment.appAttributes,
  };
}

export enum CommitmentType {
  PreFundSetup = 0,
  PostFundSetup = 1,
  App = 2,
  Conclude = 3,
}
