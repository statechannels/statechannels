import { Channel, Outcome, SignedState, State } from '.';

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
  channelID: string;
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

// TODO: Error handling
export function createStateFromCreateChannelParams(
  params: JsonRpcCreateChannelParams
): State {
  const { appData, appDefinition } = params;

  // TODO: We should implement a nonce negotiation protocol once it's fully specced out
  const channelNonce = '4'; // guaranteed random
  const channel: Channel = {
    channelNonce,
    participants: params.participants.map(p => p.signingAddress),
    chainId: '0x01',
  };
  return {
    channel,
    challengeDuration: '0x42',
    appData,
    appDefinition,
    outcome: params.allocations,
    turnNum: 0,
    isFinal: false,
  };
}

// TODO: Error handling
export function createStateFromUpdateChannelParams(
  state: State,
  params: JsonRpcUpdateChannelParams
): State {
  const { appData, allocations } = params;

  // TODO: check for valid transition using EVM library

  // TODO: Check if this is a final state... I guess it couldn't be

  return {
    ...state,
    turnNum: state.turnNum + 1,
    outcome: allocations,
    appData,
  };
}
