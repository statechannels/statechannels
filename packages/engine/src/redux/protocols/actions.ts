import {TwoPartyPlayerIndex} from "../types";
import {ActionConstructor} from "../utils";
import {ConcludeInstigated, ProcessProtocol} from "../../communication";
import {EngineAction} from "../actions";
export {BaseProcessAction} from "../../communication";

// -------
// Actions
// -------
export interface InitializeChannel {
  type: "ENGINE.NEW_PROCESS.INITIALIZE_CHANNEL";
  protocol: ProcessProtocol.Application;
  channelId: string;
}
export interface FundingRequested {
  type: "ENGINE.NEW_PROCESS.FUNDING_REQUESTED";
  channelId: string;
  playerIndex: TwoPartyPlayerIndex;
  protocol: ProcessProtocol.Funding;
}

export interface ConcludeRequested {
  type: "ENGINE.NEW_PROCESS.CONCLUDE_REQUESTED";
  channelId: string;
  protocol: ProcessProtocol.Concluding;
}

export interface CloseLedgerChannel {
  type: "ENGINE.NEW_PROCESS.CLOSE_LEDGER_CHANNEL";
  channelId: string;
  protocol: ProcessProtocol.CloseLedgerChannel;
}
// -------
// Constructors
// -------
export const initializeChannel: ActionConstructor<InitializeChannel> = p => ({
  type: "ENGINE.NEW_PROCESS.INITIALIZE_CHANNEL",
  protocol: ProcessProtocol.Application,
  ...p
});

export const fundingRequested: ActionConstructor<FundingRequested> = p => ({
  ...p,
  type: "ENGINE.NEW_PROCESS.FUNDING_REQUESTED",
  protocol: ProcessProtocol.Funding
});

export const concludeRequested: ActionConstructor<ConcludeRequested> = p => ({
  ...p,
  type: "ENGINE.NEW_PROCESS.CONCLUDE_REQUESTED",
  protocol: ProcessProtocol.Concluding
});

export const closeLedgerChannel: ActionConstructor<CloseLedgerChannel> = p => ({
  ...p,
  type: "ENGINE.NEW_PROCESS.CLOSE_LEDGER_CHANNEL",
  protocol: ProcessProtocol.CloseLedgerChannel
});
// -------
// Types and Guards
// -------

export type NewProcessAction =
  | InitializeChannel
  | FundingRequested
  | ConcludeRequested
  | ConcludeInstigated
  | CloseLedgerChannel;

export function isNewProcessAction(action: EngineAction): action is NewProcessAction {
  return (
    action.type === "ENGINE.NEW_PROCESS.INITIALIZE_CHANNEL" ||
    action.type === "ENGINE.NEW_PROCESS.FUNDING_REQUESTED" ||
    action.type === "ENGINE.NEW_PROCESS.CONCLUDE_REQUESTED" ||
    action.type === "ENGINE.NEW_PROCESS.CONCLUDE_INSTIGATED" ||
    action.type === "ENGINE.NEW_PROCESS.CLOSE_LEDGER_CHANNEL"
  );
}
