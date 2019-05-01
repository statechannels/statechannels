import { SignedCommitment, getChannelId } from '../../../../domain';
import { ChannelState, PartiallyOpenChannelState } from '../states';

export function partiallyOpenChannelFromCommitment(
  lastCommitment: SignedCommitment,
  ourAddress: string,
  ourPrivateKey: string,
): PartiallyOpenChannelState {
  const { turnNum, channel } = lastCommitment.commitment;
  const libraryAddress = channel.channelType;
  const participants: [string, string] = channel.participants as [string, string];
  const ourIndex = participants.indexOf(ourAddress);
  if (ourIndex === -1) {
    throw new Error('Address provided is not a participant according to the lastCommitment.');
  }
  return {
    channelId: getChannelId(lastCommitment.commitment),
    libraryAddress,
    channelNonce: lastCommitment.commitment.channel.nonce,
    funded: false,
    participants,
    address: ourAddress,
    privateKey: ourPrivateKey,
    ourIndex,
    turnNum,
    lastCommitment,
  };
}

export function channelFromCommitments(
  penultimateCommitment: SignedCommitment | undefined,
  lastCommitment: SignedCommitment,
  ourAddress: string,
  ourPrivateKey: string,
): ChannelState {
  const { turnNum, channel } = lastCommitment.commitment;
  const libraryAddress = channel.channelType;
  const participants: [string, string] = channel.participants as [string, string];
  let funded = true;
  if (turnNum <= 1) {
    funded = false;
  }
  const ourIndex = participants.indexOf(ourAddress);
  if (ourIndex === -1) {
    throw new Error('Address provided is not a participant according to the lastCommitment.');
  }

  return {
    channelId: getChannelId(lastCommitment.commitment),
    libraryAddress,
    channelNonce: lastCommitment.commitment.channel.nonce,
    funded,
    participants,
    address: ourAddress,
    privateKey: ourPrivateKey,
    ourIndex,
    turnNum,
    lastCommitment,
    penultimateCommitment,
  };
}
