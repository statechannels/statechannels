import { Properties } from '../../utils';
import { PlayerIndex } from '../../types';

export const WAIT_FOR_APPROVAL = 'WAIT_FOR_APPROVAL';
export const WAIT_FOR_PRE_FUND_SETUP_0 = 'WAIT_FOR_PRE_FUND_SETUP_0';
export const WAIT_FOR_DIRECT_FUNDING = 'WAIT_FOR_DIRECT_FUNDING';
export const WAIT_FOR_POST_FUND_SETUP_0 = 'WAIT_FOR_POST_FUND_SETUP_0';
export const WAIT_FOR_LEDGER_UPDATE_0 = 'WAIT_FOR_LEDGER_UPDATE_0';

interface BasePlayerBState {
  channelId: string;
  player: PlayerIndex.B;
}

interface LedgerChannelExists extends BasePlayerBState {
  ledgerId: string;
}

export interface WaitForApproval extends BasePlayerBState {
  type: typeof WAIT_FOR_APPROVAL;
}

export interface WaitForPreFundSetup0 extends BasePlayerBState {
  type: typeof WAIT_FOR_PRE_FUND_SETUP_0;
}

export interface WaitForDirectFunding extends LedgerChannelExists {
  type: typeof WAIT_FOR_DIRECT_FUNDING;
}
export interface WaitForPostFundSetup0 extends LedgerChannelExists {
  type: typeof WAIT_FOR_POST_FUND_SETUP_0;
}
export interface WaitForLedgerUpdate0 extends LedgerChannelExists {
  type: typeof WAIT_FOR_LEDGER_UPDATE_0;
}

export type PlayerBState =
  | WaitForApproval
  | WaitForPreFundSetup0
  | WaitForDirectFunding
  | WaitForPostFundSetup0
  | WaitForLedgerUpdate0;

export function waitForApproval(params: Properties<WaitForApproval>): WaitForApproval {
  const { channelId } = params;

  return { type: WAIT_FOR_APPROVAL, player: PlayerIndex.B, channelId };
}

export function waitForPreFundSetup0(
  params: Properties<WaitForPreFundSetup0>,
): WaitForPreFundSetup0 {
  const { channelId } = params;
  return { type: WAIT_FOR_PRE_FUND_SETUP_0, player: PlayerIndex.B, channelId };
}

export function waitForDirectFunding(
  params: Properties<WaitForDirectFunding>,
): WaitForDirectFunding {
  const { channelId, ledgerId } = params;
  return { type: WAIT_FOR_DIRECT_FUNDING, player: PlayerIndex.B, channelId, ledgerId };
}

export function waitForPostFundSetup0(
  params: Properties<WaitForPostFundSetup0>,
): WaitForPostFundSetup0 {
  const { channelId, ledgerId } = params;
  return { type: WAIT_FOR_POST_FUND_SETUP_0, player: PlayerIndex.B, channelId, ledgerId };
}

export function waitForLedgerUpdate0(
  params: Properties<WaitForLedgerUpdate0>,
): WaitForLedgerUpdate0 {
  const { channelId, ledgerId } = params;
  return { type: WAIT_FOR_LEDGER_UPDATE_0, player: PlayerIndex.B, channelId, ledgerId };
}
