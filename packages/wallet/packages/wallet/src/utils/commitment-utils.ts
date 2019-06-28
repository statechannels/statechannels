import { Commitment, CommitmentType } from '../domain';
import { appAttributesFromBytes } from 'fmg-nitro-adjudicator/lib/consensus-app';
import { TwoPartyPlayerIndex } from '../redux/types';
import { ChannelState, getLastCommitment } from '../redux/channel-store';

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
  ourIndex: TwoPartyPlayerIndex,
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
    getLastCommitment(channelState).commitmentType === CommitmentType.Conclude ? 1 : 0;

  const concludeCommitment: Commitment = {
    ...getLastCommitment(channelState),
    commitmentType: CommitmentType.Conclude,
    turnNum: getLastCommitment(channelState).turnNum + 1,
    commitmentCount,
  };

  return concludeCommitment;
};
