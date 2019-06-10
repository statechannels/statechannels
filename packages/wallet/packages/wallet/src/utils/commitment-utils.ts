import { Commitment, CommitmentType } from '../domain';
import { appAttributesFromBytes } from 'fmg-nitro-adjudicator';
import { PlayerIndex } from '../redux/types';
import { ChannelState } from '../redux/channel-store';

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

export const composeConcludeCommitment = (channelState: ChannelState) => {
  const commitmentCount =
    channelState.lastCommitment.commitment.commitmentType === CommitmentType.Conclude ? 1 : 0;

  const concludeCommitment: Commitment = {
    ...channelState.lastCommitment.commitment,
    commitmentType: CommitmentType.Conclude,
    turnNum: channelState.lastCommitment.commitment.turnNum + 1,
    commitmentCount,
  };

  return concludeCommitment;
};
