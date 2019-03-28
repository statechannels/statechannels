import { WalletAction } from '../actions';

export const DIRECT_FUNDING_REQUESTED = 'WALLET.INTERNAL.FUNDING.DIRECT_FUNDING_REQUESTED';
export const directFundingRequested = (
  channelId: string,
  safeToDepositLevel: string,
  totalFundingRequired: string,
  requiredDeposit: string,
  ourIndex: number,
) => ({
  type: DIRECT_FUNDING_REQUESTED as typeof DIRECT_FUNDING_REQUESTED,
  channelId,
  totalFundingRequired,
  safeToDepositLevel,
  requiredDeposit,
  ourIndex,
});
export type DirectFundingRequested = ReturnType<typeof directFundingRequested>;

export const DIRECT_FUNDING_CONFIRMED = 'WALLET.INTERNAL.CHANNEL.DIRECT_FUNDING_CONFIRMED';
export const directFundingConfirmed = (channelId: string) => ({
  type: DIRECT_FUNDING_CONFIRMED as typeof DIRECT_FUNDING_CONFIRMED,
  channelId,
});
export type DirectFundingConfirmed = ReturnType<typeof directFundingConfirmed>;

export type InternalFundingAction = DirectFundingRequested;
export type InternalChannelAction = DirectFundingConfirmed;

export type InternalAction = InternalFundingAction | InternalChannelAction;

export const isInternalAction = (action: WalletAction): action is InternalAction => {
  return action.type.match('WALLET.INTERNAL') ? true : false;
};

export const isFundingAction = (action: WalletAction): action is InternalFundingAction => {
  return action.type.match('WALLET.INTERNAL.FUNDING') ? true : false;
};

export const isChannelAction = (action: WalletAction): action is InternalChannelAction => {
  return action.type.match('WALLET.INTERNAL.CHANNEL') ? true : false;
};
