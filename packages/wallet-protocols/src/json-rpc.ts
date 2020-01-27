import { State } from '@statechannels/nitro-protocol';

import { SignedState } from './types';
import { ethAllocationOutcome } from './calculations';

import { Channel } from '.';

interface ChannelParticipant {
  participantId?: string;
  signingAddress: string;
  destination?: string;
}

interface OpenChannel {
  type: 'Channel.Open';
  participants: ChannelParticipant[];
  signedState: SignedState;
}
type WalletMessage = OpenChannel;

export interface JsonRpcParticipant {
  participantId: string;
  signingAddress: string;
  destination: string;
}

export interface JsonRpcAllocationItem {
  destination: string;
  amount: string;
}
export type JsonRpcAllocations = JsonRpcAllocationItem[];

export interface JsonRpcCreateChannelParams {
  participants: JsonRpcParticipant[];
  allocations: JsonRpcAllocations;
  appDefinition: string;
  appData: string;
}

export interface JsonRpcJoinChannelParams {
  channelId: string;
}

export interface JsonRpcMessage {
  recipient: string;
  sender: string;
  data: WalletMessage;
}

export interface JsonRpcUpdateChannelParams {
  allocations: JsonRpcAllocations;
  appData: string;
  channelId: string;
}
