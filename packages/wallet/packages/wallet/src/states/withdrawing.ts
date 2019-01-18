import { AdjudicatorExists, adjudicatorExists } from './shared';

// stage
export const WITHDRAWING = 'STAGE.WITHDRAWING';

// state types
export const APPROVE_WITHDRAWAL = 'APPROVE_WITHDRAWAL';
export const WAIT_FOR_WITHDRAWAL_INITIATION = 'WAIT_FOR_WITHDRAWAL_INITIATION';
export const WAIT_FOR_WITHDRAWAL_CONFIRMATION = 'WAIT_FOR_WITHDRAWAL_CONFIRMATION';
export const ACKNOWLEDGE_WITHDRAWAL_SUCCESS = 'ACKNOWLEDGE_WITHDRAWAL_SUCCESS';

export interface ApproveWithdrawal extends AdjudicatorExists {
  type: typeof APPROVE_WITHDRAWAL;
  stage: typeof WITHDRAWING;
}



export interface WaitForWithdrawalInitiation extends AdjudicatorExists {
  type: typeof WAIT_FOR_WITHDRAWAL_INITIATION;
  stage: typeof WITHDRAWING;
}

export interface WaitForWithdrawalConfirmation extends AdjudicatorExists {
  type: typeof WAIT_FOR_WITHDRAWAL_CONFIRMATION;
  stage: typeof WITHDRAWING;
}

export interface AcknowledgeWithdrawalSuccess extends AdjudicatorExists {
  type: typeof ACKNOWLEDGE_WITHDRAWAL_SUCCESS;
  stage: typeof WITHDRAWING;
}

export function approveWithdrawal<T extends AdjudicatorExists>(params: T): ApproveWithdrawal {
  return { ...adjudicatorExists(params), type: APPROVE_WITHDRAWAL, stage: WITHDRAWING };
}

export function waitForWithdrawalInitiation<T extends AdjudicatorExists>(params: T): WaitForWithdrawalInitiation {
  return { ...adjudicatorExists(params), type: WAIT_FOR_WITHDRAWAL_INITIATION, stage: WITHDRAWING };
}

export function waitForWithdrawalConfirmation<T extends AdjudicatorExists>(params: T): WaitForWithdrawalConfirmation {
  return { ...adjudicatorExists(params), type: WAIT_FOR_WITHDRAWAL_CONFIRMATION, stage: WITHDRAWING };
}

export function acknowledgeWithdrawalSuccess<T extends AdjudicatorExists>(params: T): AcknowledgeWithdrawalSuccess {
  return { ...adjudicatorExists(params), type: ACKNOWLEDGE_WITHDRAWAL_SUCCESS, stage: WITHDRAWING };
}


export type WithdrawingState = (
  | ApproveWithdrawal
  | WaitForWithdrawalInitiation
  | WaitForWithdrawalConfirmation
  | AcknowledgeWithdrawalSuccess
);
