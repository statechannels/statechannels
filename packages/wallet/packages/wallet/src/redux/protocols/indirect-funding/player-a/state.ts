import { Properties } from '../../../utils';
import { PlayerIndex } from '../../../types';
import { DirectFundingState } from '../../direct-funding/state';

export const WAIT_FOR_APPROVAL = 'WAIT_FOR_APPROVAL';
export const WAIT_FOR_PRE_FUND_SETUP_1 = 'WAIT_FOR_PRE_FUND_SETUP_1';
export const WAIT_FOR_DIRECT_FUNDING = 'WAIT_FOR_DIRECT_FUNDING';
export const WAIT_FOR_POST_FUND_SETUP_1 = 'WAIT_FOR_POST_FUND_SETUP_1';
export const WAIT_FOR_LEDGER_UPDATE_1 = 'WAIT_FOR_LEDGER_UPDATE_1';

interface BasePlayerAState {
  channelId: string;
  player: PlayerIndex.A;
}

interface LedgerChannelExists extends BasePlayerAState {
  ledgerId: string;
}

export interface WaitForApproval extends BasePlayerAState {
  type: typeof WAIT_FOR_APPROVAL;
}

export interface WaitForPreFundSetup1 extends LedgerChannelExists {
  type: typeof WAIT_FOR_PRE_FUND_SETUP_1;
}

export interface WaitForDirectFunding extends LedgerChannelExists {
  type: typeof WAIT_FOR_DIRECT_FUNDING;
  directFundingState: DirectFundingState;
}
export interface WaitForPostFundSetup1 extends LedgerChannelExists {
  type: typeof WAIT_FOR_POST_FUND_SETUP_1;
}
export interface WaitForLedgerUpdate1 extends LedgerChannelExists {
  type: typeof WAIT_FOR_LEDGER_UPDATE_1;
}

export type PlayerAState =
  | WaitForApproval
  | WaitForPreFundSetup1
  | WaitForDirectFunding
  | WaitForPostFundSetup1
  | WaitForLedgerUpdate1;

export function waitForApproval(params: Properties<WaitForApproval>): WaitForApproval {
  const { channelId } = params;

  return { type: WAIT_FOR_APPROVAL, player: PlayerIndex.A, channelId };
}

export function waitForPreFundSetup1(
  params: Properties<WaitForPreFundSetup1>,
): WaitForPreFundSetup1 {
  const { channelId, ledgerId } = params;
  return { type: WAIT_FOR_PRE_FUND_SETUP_1, player: PlayerIndex.A, channelId, ledgerId };
}

export function waitForDirectFunding(
  params: Properties<WaitForDirectFunding>,
): WaitForDirectFunding {
  const { channelId, ledgerId, directFundingState } = params;
  return {
    type: WAIT_FOR_DIRECT_FUNDING,
    player: PlayerIndex.A,
    channelId,
    ledgerId,
    directFundingState,
  };
}

export function waitForPostFundSetup1(
  params: Properties<WaitForPostFundSetup1>,
): WaitForPostFundSetup1 {
  const { channelId, ledgerId } = params;
  return { type: WAIT_FOR_POST_FUND_SETUP_1, player: PlayerIndex.A, channelId, ledgerId };
}

export function waitForLedgerUpdate1(
  params: Properties<WaitForLedgerUpdate1>,
): WaitForLedgerUpdate1 {
  const { channelId, ledgerId } = params;
  return { type: WAIT_FOR_LEDGER_UPDATE_1, player: PlayerIndex.A, channelId, ledgerId };
}
