import { Commitment } from '../../domain';
import { bigNumberify } from 'ethers/utils';

export interface AdjudicatorState {
  [channelId: string]: AdjudicatorChannelState;
}
export interface AdjudicatorChannelState {
  channelId: string;
  balance: string;
  finalized: boolean;
  challenge?: Challenge;
}
export interface Challenge {
  expiresAt: number;
  challengeCommitment: Commitment;
}

function getOrCreateAdjudicatorChannelState(
  adjudicatorState: AdjudicatorState,
  channelId: string,
): AdjudicatorChannelState {
  let channelState = getAdjudicatorChannelState(adjudicatorState, channelId);
  if (!channelState) {
    channelState = { channelId, balance: '0x0', finalized: false };
  }
  return channelState;
}
export function getAdjudicatorChannelState(
  adjudicatorState: AdjudicatorState,
  channelId: string,
): AdjudicatorChannelState | undefined {
  return adjudicatorState[channelId];
}
function setAdjudicatorChannelState(
  adjudicatorState: AdjudicatorState,
  channelState: AdjudicatorChannelState,
) {
  return {
    ...adjudicatorState,
    [channelState.channelId]: channelState,
  };
}

export function clearChallenge(
  adjudicatorState: AdjudicatorState,
  channelId: string,
): AdjudicatorState {
  const channelState = getOrCreateAdjudicatorChannelState(adjudicatorState, channelId);
  const newChannelState = { ...channelState, challenge: undefined };
  return setAdjudicatorChannelState(adjudicatorState, newChannelState);
}

export function setChallenge(
  adjudicatorState: AdjudicatorState,
  channelId: string,
  challenge: Challenge,
): AdjudicatorState {
  const channelState = getOrCreateAdjudicatorChannelState(adjudicatorState, channelId);
  const newChannelState = { ...channelState, challenge };
  return setAdjudicatorChannelState(adjudicatorState, newChannelState);
}

export function markAsFinalized(
  adjudicatorState: AdjudicatorState,
  channelId: string,
): AdjudicatorState {
  const channelState = getOrCreateAdjudicatorChannelState(adjudicatorState, channelId);
  const newChannelState = { ...channelState, finalized: true };
  return setAdjudicatorChannelState(adjudicatorState, newChannelState);
}

export function addToBalance(
  adjudicatorState: AdjudicatorState,
  channelId: string,
  amount: string,
): AdjudicatorState {
  const channelState = getOrCreateAdjudicatorChannelState(adjudicatorState, channelId);
  const newBalance = bigNumberify(channelState.balance)
    .add(amount)
    .toHexString();
  const newChannelState = { ...channelState, balance: newBalance };
  return setAdjudicatorChannelState(adjudicatorState, newChannelState);
}
