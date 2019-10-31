import {SignedCommitment, Commitment, signCommitment2, getCommitmentChannelId} from "../../../domain";
import {Wallet} from "ethers";
import {SignedState} from "@statechannels/nitro-protocol";
import {convertStateToCommitment} from "../../../utils/nitro-converter";

export type Commitments = SignedCommitment[];

export interface ChannelState {
  address: string;
  privateKey: string;
  channelId: string;
  libraryAddress: string;
  ourIndex: number;
  participants: string[];
  channelNonce: string;
  turnNum: number;
  signedStates: SignedState[];
  funded: boolean;
}

export type OpenChannelState = ChannelState;

export function getLastCommitment(state: ChannelState): Commitment {
  return convertStateToCommitment(state.signedStates.slice(-1)[0].state);
}

export function getPenultimateCommitment(state: ChannelState): Commitment {
  return convertStateToCommitment(state.signedStates.slice(-2)[0].state);
}

export function getCommitments(state: ChannelState): Commitments {
  return state.signedStates.map(ss => signCommitment2(convertStateToCommitment(ss.state), state.privateKey));
}
// -------
// Helpers
// -------

export function initializeChannel(signedState: SignedState, privateKey: string): ChannelState {
  const {state} = signedState;
  const {turnNum, channel, appDefinition} = state;
  const {participants, channelNonce} = channel;
  const address = new Wallet(privateKey).address;
  const ourIndex = state.channel.participants.indexOf(address);
  // TODO: Temporary until everything is converted to use signedStates
  // This allows commitment channelIds to be used for now in our protocols
  const commitment = convertStateToCommitment(signedState.state);
  const channelId = getCommitmentChannelId(commitment);
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

// Pushes a commitment onto the state, updating penultimate/last commitments and the turn number
export function pushState(state: ChannelState, signedState: SignedState): ChannelState {
  const signedStates = [...state.signedStates];
  const numParticipants = state.participants.length;
  if (signedStates.length === numParticipants) {
    // We've got a full round of commitments, and should therefore drop the first one
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
  return participants[theirIndex];
}

export function nextParticipant(participants, ourIndex: number): string {
  if (ourIndex >= participants.length || ourIndex < 0) {
    throw new Error(`Invalid index: ${ourIndex} must be between 0 and ${participants.length}`);
  }

  const theirIndex = (ourIndex + 1) % participants.length;
  return participants[theirIndex];
}
