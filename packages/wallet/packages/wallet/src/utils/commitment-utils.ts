import { Commitment, CommitmentType, signCommitment2 } from '../domain';
import { appAttributesFromBytes, bytesFromAppAttributes } from 'fmg-nitro-adjudicator';
import { PlayerIndex } from '../redux/types';
import { signCommitment } from '../domain';
import { Channel } from 'fmg-core';
import { SignedCommitment } from '../domain';
import { messageRelayRequested } from 'magmo-wallet-client/lib/wallet-events';
import { ChannelState } from '../redux/channel-store/state';

export const hasConsensusBeenReached = (
  lastCommitment: Commitment,
  penultimateCommitment: Commitment,
): boolean => {
  const numOfPlayers = lastCommitment.channel.participants.length;
  const lastAppAttributes = appAttributesFromBytes(lastCommitment.appAttributes);
  const penultimateAppAttributes = appAttributesFromBytes(penultimateCommitment.appAttributes);

  if (
    lastAppAttributes.consensusCounter === numOfPlayers - 1 &&
    lastCommitment.allocation === penultimateAppAttributes.proposedAllocation &&
    lastCommitment.destination === penultimateAppAttributes.proposedDestination
  ) {
    return true;
  } else {
    return false;
  }
};

// Commitment composers

export const composeLedgerUpdateCommitment = (
  channel: Channel,
  turnNum: number,
  ourIndex: PlayerIndex,
  proposedAllocation: string[],
  proposedDestination: string[],
  allocation: string[],
  destination: string[],
  privateKey: string,
) => {
  const appAttributes = bytesFromAppAttributes({
    proposedAllocation,
    proposedDestination,
    consensusCounter: ourIndex,
  });
  const commitment: Commitment = {
    channel,
    commitmentType: CommitmentType.App,
    turnNum,
    commitmentCount: ourIndex,
    allocation,
    destination,
    appAttributes,
  };

  return signCommitment2(commitment, privateKey);
};

export const composePostFundCommitment = (
  lastCommitment: Commitment,
  ourIndex: PlayerIndex,
  privateKey: string,
): SignedCommitment => {
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

  return signCommitment2(commitment, privateKey);
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
    consensusCounter: 0,
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

export const composeConcludeCommitment = (channelState: ChannelState) => {
  const commitmentCount =
    channelState.lastCommitment.commitment.commitmentType === CommitmentType.Conclude ? 1 : 0;

  const concludeCommitment: Commitment = {
    ...channelState.lastCommitment.commitment,
    appAttributes: '',
    commitmentType: CommitmentType.Conclude,
    turnNum: channelState.lastCommitment.commitment.turnNum + 1,
    commitmentCount,
  };

  const commitmentSignature = signCommitment(concludeCommitment, channelState.privateKey);
  const sendCommitmentAction = messageRelayRequested(
    channelState.participants[1 - channelState.ourIndex],
    {
      processId: channelState.channelId,
      data: {
        concludeCommitment,
        commitmentSignature,
      },
    },
  );
  return { concludeCommitment, commitmentSignature, sendCommitmentAction };
};
