import {ConcludeInstigated} from "./actions";
export {
  relayActionWithMessage,
  RelayActionWithMessage
} from "../redux/sagas/messaging/outgoing-api-actions";

export * from "./actions";

// These protocols are precisely those that run at the top-level
export const enum ProcessProtocol {
  Application = "Application",
  Funding = "Funding",
  Concluding = "Concluding",
  CloseLedgerChannel = "CloseLedgerChannel"
}

export const enum EmbeddedProtocol {
  AdvanceChannel = "AdvanceChannel",
  ConsensusUpdate = "ConsensusUpdate",
  DirectFunding = "DirectFunding", // TODO: Post-fund-setup exchange will be removed from direct funding, so this should be removed
  ExistingLedgerFunding = "ExistingLedgerFunding",
  LedgerDefunding = "LedgerDefunding",
  LedgerFunding = "LedgerFunding",
  LedgerTopUp = "LedgerTopUp",
  NewLedgerChannel = "NewLedgerChannel",
  VirtualFunding = "VirtualFunding",
  FundingStrategyNegotiation = "FundingStrategyNegotiation",
  VirtualDefunding = "VirtualDefunding",
  Defunding = "Defunding",
  CloseLedgerChannel = "CloseLedgerChannel"
}

export type ProtocolLocator = EmbeddedProtocol[];
export type FundingStrategy = "IndirectFundingStrategy" | "VirtualFundingStrategy";

export type StartProcessAction = ConcludeInstigated;

export function isStartProcessAction(a: {type: string}): a is StartProcessAction {
  return a.type === "WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED";
}

export function getProcessId(action: StartProcessAction) {
  return `${action.protocol}-${action.channelId}`;
}
