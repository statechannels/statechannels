import {BigNumber} from 'ethers/utils';
import {Outcome} from '@statechannels/nitro-protocol';

export const a = 1;

export interface Participant {
  participantId: string;
  signingAddress: string;
  destination: string;
}

export interface StateVariables {
  outcome: Outcome;
  turnNum: BigNumber;
  appData: string;
  isFinal: boolean;
}

export interface ChannelConstants {
  chainId: string;
  participants: Participant[];
  channelNonce: BigNumber;
  appDefinition: string;
  challengeDuration: BigNumber;
}

export interface State extends ChannelConstants, StateVariables {
  channelId: string;
}

export interface SignedState extends State {
  signature: string;
}
