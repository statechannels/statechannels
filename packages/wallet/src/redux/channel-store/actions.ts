import { Commitment } from '../../domain';

export const OWN_COMMITMENT_RECEIVED = 'WALLET.CHANNEL.OWN_COMMITMENT_RECEIVED';
export const ownCommitmentReceived = (commitment: Commitment) => ({
  type: OWN_COMMITMENT_RECEIVED as typeof OWN_COMMITMENT_RECEIVED,
  commitment,
});
export type OwnCommitmentReceived = ReturnType<typeof ownCommitmentReceived>;

export const OPPONENT_COMMITMENT_RECEIVED = 'WALLET.CHANNEL.OPPONENT_COMMITMENT_RECEIVED';
export const opponentCommitmentReceived = (commitment: Commitment, signature: string) => ({
  type: OPPONENT_COMMITMENT_RECEIVED as typeof OPPONENT_COMMITMENT_RECEIVED,
  commitment,
  signature,
});
export type OpponentCommitmentReceived = ReturnType<typeof opponentCommitmentReceived>;

export type ChannelAction = OpponentCommitmentReceived | OwnCommitmentReceived;
