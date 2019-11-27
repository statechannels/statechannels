import {Wallet} from "ethers";
import {SignedState, State, getChannelId} from "@statechannels/nitro-protocol";

export interface ChannelParticipant {
  participantId?: string;
  signingAddress: string;
  destination?: string;
}

export interface ChannelState {
  address: string;
  privateKey: string;
  channelId: string;
  libraryAddress: string;
  ourIndex: number;
  participants: ChannelParticipant[];
  channelNonce: string;
  turnNum: number;
  signedStates: SignedState[];
  funded: boolean;
}

export type OpenChannelState = ChannelState;

export function getLastState(state: ChannelState): State {
  return state.signedStates.slice(-1)[0].state;
}

export function getPenultimateState(state: ChannelState): State {
  return state.signedStates.slice(-2)[0].state;
}

export function getStates(state: ChannelState): SignedState[] {
  return state.signedStates;
}

// -------
// Helpers
// -------

export function initializeChannel(
  signedState: SignedState,
  privateKey: string,
  participants: ChannelParticipant[]
): ChannelState {
  const {state} = signedState;
  const {turnNum, channel, appDefinition} = state;
  const {channelNonce} = channel;
  const address = new Wallet(privateKey).address;
  const ourIndex = state.channel.participants.indexOf(address);

  const channelId = getChannelId(state.channel);
  return {
    address,
    privateKey,
    turnNum,
    ourIndex,
    libraryAddress: appDefinition,
    participants,
    channelNonce,
    channelId,
    funded: false,
    signedStates: [signedState]
  };
}

// Pushes a state onto the state, updating penultimate/last states and the turn number
export function pushState(state: ChannelState, signedState: SignedState): ChannelState {
  const signedStates = [...state.signedStates];
  const numParticipants = state.participants.length;
  if (signedStates.length === numParticipants) {
    // We've got a full round of states, and should therefore drop the first one
    signedStates.shift();
  }

  signedStates.push(signedState);
  const turnNum = signedState.state.turnNum;
  return {...state, signedStates, turnNum};
}

export function ourTurn(state: ChannelState) {
  const {turnNum, participants, ourIndex} = state;
  const numParticipants = participants.length;

  return (turnNum + 1) % numParticipants === ourIndex;
}

export function isFullyOpen(state: ChannelState): state is OpenChannelState {
  return state.participants.length === state.signedStates.length;
}

export function theirAddress(state: ChannelState): string {
  const {participants, ourIndex} = state;
  const theirIndex = 1 - ourIndex; // todo: only two player channels
  return participants[theirIndex].signingAddress;
}

export function nextParticipant(participants, ourIndex: number): ChannelParticipant {
  if (ourIndex >= participants.length || ourIndex < 0) {
    throw new Error(`Invalid index: ${ourIndex} must be between 0 and ${participants.length}`);
  }

  const theirIndex = (ourIndex + 1) % participants.length;
  return participants[theirIndex];
}
