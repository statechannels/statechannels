import { SignedCommitment, getChannelId, Commitment } from '../../../domain';
import { ethers } from 'ethers';

export type Commitments = SignedCommitment[];

export interface ChannelState {
  address: string;
  privateKey: string;
  channelId: string;
  libraryAddress: string;
  ourIndex: number;
  participants: string[];
  channelNonce: number;
  turnNum: number;
  commitments: Commitments;
  funded: boolean;
}

export type OpenChannelState = ChannelState;

export function getLastCommitment(state: ChannelState): Commitment {
  return state.commitments.slice(-1)[0].commitment;
}

export function getPenultimateCommitment(state: ChannelState): Commitment {
  return state.commitments.slice(-2)[0].commitment;
}

// -------
// Helpers
// -------

export function initializeChannel(
  signedCommitment: SignedCommitment,
  privateKey: string,
): ChannelState {
  const { commitment } = signedCommitment;
  const { turnNum, channel } = commitment;
  const address = new ethers.Wallet(privateKey).address;
  const ourIndex = commitment.channel.participants.indexOf(address);
  const channelId = getChannelId(commitment);
  return {
    address,
    privateKey,
    turnNum,
    ourIndex,
    libraryAddress: channel.channelType,
    participants: channel.participants as [string, string],
    channelNonce: channel.nonce,
    channelId,
    funded: false,
    commitments: [signedCommitment],
  };
}

// Pushes a commitment onto the state, updating penultimate/last commitments and the turn number
export function pushCommitment(
  state: ChannelState,
  signedCommitment: SignedCommitment,
): ChannelState {
  const commitments = [...state.commitments];
  const numParticipants = state.participants.length;
  if (commitments.length === numParticipants) {
    // We've got a full round of commitments, and should therefore drop the first one
    commitments.shift();
  }
  commitments.push(signedCommitment);
  const turnNum = signedCommitment.commitment.turnNum;
  return { ...state, commitments, turnNum };
}

export function ourTurn(state: ChannelState) {
  const { turnNum, participants, ourIndex } = state;
  const numParticipants = participants.length;

  return (turnNum + 1) % numParticipants === ourIndex;
}

export function isFullyOpen(state: ChannelState): state is OpenChannelState {
  return state.participants.length === state.commitments.length;
}

export function theirAddress(state: ChannelState): string {
  const { participants, ourIndex } = state;
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
