import { Commitment, CommitmentType } from 'magmo-wallet-client/node_modules/fmg-core';
import { appAttributesFromBytes, bytesFromAppAttributes } from 'fmg-nitro-adjudicator';
import { PlayerIndex } from '../redux/types';
import { signCommitment } from './signing-utils';
import { Channel } from 'fmg-core';

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
  lastCommitment: Commitment,
  ourIndex: PlayerIndex,
  proposedAllocation: string[],
  proposedDestination: string[],
  privateKey: string,
) => {
  const { channel, turnNum: previousTurnNum, allocation, destination } = lastCommitment;
  const appAttributes = bytesFromAppAttributes({
    proposedAllocation,
    proposedDestination,
    consensusCounter: ourIndex,
  });
  const updateCommitment: Commitment = {
    channel,
    commitmentType: CommitmentType.PostFundSetup,
    turnNum: previousTurnNum + 1,
    commitmentCount: ourIndex,
    allocation,
    destination,
    appAttributes,
  };
  const commitmentSignature = signCommitment(updateCommitment, privateKey);

  return { updateCommitment, commitmentSignature };
};

export const composePostFundCommitment = (
  lastCommitment: Commitment,
  ourIndex: PlayerIndex,
  privateKey: string,
) => {
  const {
    channel,
    turnNum: previousTurnNum,
    allocation,
    destination,
    appAttributes,
  } = lastCommitment;
  const postFundCommitment: Commitment = {
    channel,
    commitmentType: CommitmentType.PostFundSetup,
    turnNum: previousTurnNum + 1,
    commitmentCount: ourIndex,
    allocation,
    destination,
    appAttributes,
  };
  const commitmentSignature = signCommitment(postFundCommitment, privateKey);

  return { postFundCommitment, commitmentSignature };
};
export const composePreFundCommitment = (
  channel: Channel,
  allocation: string[],
  destination: string[],
  ourIndex: PlayerIndex,
  privateKey: string,
) => {
  const appAttributes = bytesFromAppAttributes({
    proposedAllocation: allocation,
    proposedDestination: destination,
    consensusCounter: ourIndex,
  });
  const preFundSetupCommitment: Commitment = {
    channel,
    commitmentType: CommitmentType.PreFundSetup,
    turnNum: ourIndex,
    commitmentCount: ourIndex,
    allocation,
    destination,
    appAttributes,
  };
  const commitmentSignature = signCommitment(preFundSetupCommitment, privateKey);

  return { preFundSetupCommitment, commitmentSignature };
};
