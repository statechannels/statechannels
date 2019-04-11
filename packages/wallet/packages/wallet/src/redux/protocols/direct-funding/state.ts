import * as depositing from './depositing/state';
import { DirectFundingRequested } from '../../internal/actions';
import { bigNumberify } from 'ethers/utils';
import { createDepositTransaction } from '../../../utils/transaction-generator';
import { WalletProcedure } from '../../types';
export { depositing };
// ChannelFundingStatus
export const NOT_SAFE_TO_DEPOSIT = 'NOT_SAFE_TO_DEPOSIT';
export const SAFE_TO_DEPOSIT = 'SAFE_TO_DEPOSIT';
export const CHANNEL_FUNDED = 'CHANNEL_FUNDED';
// Funding status
export type ChannelFundingStatus =
  | typeof NOT_SAFE_TO_DEPOSIT
  | typeof SAFE_TO_DEPOSIT
  | typeof CHANNEL_FUNDED;
export const DIRECT_FUNDING = 'FUNDING_TYPE.DIRECT';
export interface BaseDirectFundingState {
  safeToDepositLevel: string;
  depositStatus?: depositing.DepositStatus;
  channelFundingStatus: ChannelFundingStatus;
  requestedTotalFunds: string;
  requestedYourContribution: string;
  channelId: string;
  ourIndex: number;
}
export interface NotSafeToDeposit extends BaseDirectFundingState {
  channelFundingStatus: typeof NOT_SAFE_TO_DEPOSIT;
}
export interface WaitForFundingConfirmation extends BaseDirectFundingState {
  depositStatus: typeof depositing.DEPOSIT_CONFIRMED;
  channelFundingStatus: typeof SAFE_TO_DEPOSIT;
}
export interface ChannelFunded extends BaseDirectFundingState {
  depositStatus: depositing.DepositStatus;
  channelFundingStatus: typeof CHANNEL_FUNDED;
}
// constructors
export function baseDirectFundingState<T extends BaseDirectFundingState>(
  params: T,
): BaseDirectFundingState {
  const {
    requestedTotalFunds,
    requestedYourContribution,
    channelId,
    ourIndex,
    safeToDepositLevel,
    channelFundingStatus,
  } = params;
  return {
    requestedTotalFunds,
    requestedYourContribution,
    channelId,
    ourIndex,
    safeToDepositLevel,
    channelFundingStatus,
  };
}
export function notSafeToDeposit<T extends BaseDirectFundingState>(params: T): NotSafeToDeposit {
  return {
    ...baseDirectFundingState(params),
    channelFundingStatus: NOT_SAFE_TO_DEPOSIT,
  };
}
export function waitForFundingConfirmed<T extends BaseDirectFundingState>(
  params: T,
): WaitForFundingConfirmation {
  return {
    ...baseDirectFundingState(params),
    depositStatus: depositing.DEPOSIT_CONFIRMED,
    channelFundingStatus: SAFE_TO_DEPOSIT,
  };
}
export function channelFunded<T extends BaseDirectFundingState>(params: T): ChannelFunded {
  return {
    ...baseDirectFundingState(params),
    depositStatus: depositing.DEPOSIT_CONFIRMED,
    channelFundingStatus: CHANNEL_FUNDED,
  };
}
// type guards
const guardGenerator = <T extends DirectFundingState>(type) => (
  state: DirectFundingState,
): state is T => {
  return state.channelFundingStatus === type;
};
export const stateIsNotSafeToDeposit = guardGenerator<NotSafeToDeposit>(NOT_SAFE_TO_DEPOSIT);
export const stateIsDepositing = (state: DirectFundingState): state is depositing.Depositing => {
  return (
    state.channelFundingStatus === SAFE_TO_DEPOSIT &&
    state.depositStatus !== depositing.DEPOSIT_CONFIRMED
  );
};
export const stateIsWaitForFundingConfirmation = (
  state: DirectFundingState,
): state is WaitForFundingConfirmation => {
  return (
    state.channelFundingStatus === SAFE_TO_DEPOSIT &&
    state.depositStatus === depositing.DEPOSIT_CONFIRMED
  );
};
export const stateIsChannelFunded = guardGenerator<ChannelFunded>(CHANNEL_FUNDED);
export type DirectFundingState =
  | NotSafeToDeposit
  | depositing.Depositing
  | WaitForFundingConfirmation
  | ChannelFunded;

export function initialDirectFundingState(action: DirectFundingRequested) {
  const { safeToDepositLevel, totalFundingRequired, requiredDeposit, channelId, ourIndex } = action;

  const alreadySafeToDeposit = bigNumberify(safeToDepositLevel).eq('0x');
  const alreadyFunded = bigNumberify(totalFundingRequired).eq('0x');

  const channelFundingStatus = alreadyFunded
    ? CHANNEL_FUNDED
    : alreadySafeToDeposit
    ? SAFE_TO_DEPOSIT
    : NOT_SAFE_TO_DEPOSIT;

  const stateConstructor: any = alreadyFunded
    ? channelFunded
    : alreadySafeToDeposit
    ? depositing.waitForTransactionSent
    : notSafeToDeposit;

  const transactionOutbox = alreadySafeToDeposit
    ? {
        transactionRequest: createDepositTransaction(action.channelId, action.requiredDeposit),
        channelId,
        procedure: WalletProcedure.DirectFunding,
      }
    : undefined;

  return {
    state: stateConstructor({
      fundingType: DIRECT_FUNDING,
      channelFundingStatus,
      safeToDepositLevel,
      channelId,
      requestedTotalFunds: totalFundingRequired,
      requestedYourContribution: requiredDeposit,
      ourIndex,
    }),
    sideEffects: { transactionOutbox },
  };
}
