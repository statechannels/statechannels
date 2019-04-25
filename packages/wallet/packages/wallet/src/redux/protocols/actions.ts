import { WalletAction, ProtocolAction } from '../actions';
import { PlayerIndex, WalletProtocol } from '../types';

export const FUNDING_REQUESTED = 'WALLET.NEW_PROCESS.FUNDING_REQUESTED';
export const fundingRequested = (channelId: string, playerIndex: PlayerIndex) => ({
  type: FUNDING_REQUESTED as typeof FUNDING_REQUESTED,
  channelId,
  playerIndex,
  protocol: WalletProtocol.IndirectFunding,
});
export type FundingRequested = ReturnType<typeof fundingRequested>;

export type NewProcessAction = FundingRequested;
export function isNewProcessAction(action: WalletAction): action is NewProcessAction {
  return action.type === FUNDING_REQUESTED;
}

export interface BaseProcessAction {
  processId: string;
  type: string;
}

export function isProtocolAction(action: WalletAction): action is ProtocolAction {
  return 'processId' in action;
}
