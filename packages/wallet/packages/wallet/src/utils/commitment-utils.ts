import { Commitment, CommitmentType, signCommitment2 } from '../domain';
import { appAttributesFromBytes, bytesFromAppAttributes } from 'fmg-nitro-adjudicator';
import { PlayerIndex } from '../redux/types';
import { Channel } from 'fmg-core';
import { SignedCommitment } from '../domain';
import { ChannelState } from '../redux/channel-store';
import { UpdateType } from 'fmg-nitro-adjudicator/lib/consensus-app';

export const hasConsensusBeenReached = (
  lastCommitment: Commitment,
  penultimateCommitment: Commitment,
): boolean => {
  const lastAppAttributes = appAttributesFromBytes(lastCommitment.appAttributes);
  const penultimateAppAttributes = appAttributesFromBytes(penultimateCommitment.appAttributes);

  if (
    lastAppAttributes.furtherVotesRequired === 0 &&
    lastCommitment.allocation === penultimateAppAttributes.proposedAllocation &&
    lastCommitment.destination === penultimateAppAttributes.proposedDestination
  ) {
    return true;
  } else {
    return false;
  }
};

// Commitment composers

export const composePostFundCommitment = (
  lastCommitment: Commitment,
  ourIndex: PlayerIndex,
): Commitment => {
  const {
    channel,
    turnNum: previousTurnNum,
    allocation,
    destination,
    appAttributes,
  } = lastCommitment;
  const commitment: Commitment = {
    channel,
    commitmentType: CommitmentType.PostFundSetup,
    turnNum: previousTurnNum + 1,
    commitmentCount: ourIndex,
    allocation,
    destination,
    appAttributes,
  };

  return commitment;
};
export const composePreFundCommitment = (
  channel: Channel,
  allocation: string[],
  destination: string[],
  ourIndex: PlayerIndex,
  privateKey: string,
): SignedCommitment => {
  const appAttributes = bytesFromAppAttributes({
    proposedAllocation: allocation,
    proposedDestination: destination,
    furtherVotesRequired: 0,
    updateType: UpdateType.Consensus,
  });
  const commitment: Commitment = {
    channel,
    commitmentType: CommitmentType.PreFundSetup,
    turnNum: ourIndex,
    commitmentCount: ourIndex,
    allocation,
    destination,
    appAttributes,
  };
  return signCommitment2(commitment, privateKey);
};

export const EMPTY_APP_ATTRIBUTES = bytesFromAppAttributes({
  furtherVotesRequired: 0,
  updateType: 0,
  proposedAllocation: [],
  proposedDestination: [],
});

export const composeConcludeCommitment = (channelState: ChannelState) => {
  const commitmentCount =
    channelState.lastCommitment.commitment.commitmentType === CommitmentType.Conclude ? 1 : 0;

  const concludeCommitment: Commitment = {
    ...channelState.lastCommitment.commitment,
    appAttributes: EMPTY_APP_ATTRIBUTES,
    commitmentType: CommitmentType.Conclude,
    turnNum: channelState.lastCommitment.commitment.turnNum + 1,
    commitmentCount,
  };

  return concludeCommitment;
};
