import {SignedState} from "@statechannels/nitro-protocol";

import {WalletAction} from "../redux/actions";

import {ActionConstructor} from "../redux/utils";

import {CloseLedgerChannel} from "../redux/protocols/actions";

import {FundingStrategy, ProtocolLocator, EmbeddedProtocol} from "./index";
import {ProcessProtocol} from ".";

export interface MultipleRelayableActions {
  type: "WALLET.MULTIPLE_RELAYABLE_ACTIONS";
  actions: RelayableAction[];
}

export const multipleRelayableActions: ActionConstructor<MultipleRelayableActions> = p => ({
  ...p,
  type: "WALLET.MULTIPLE_RELAYABLE_ACTIONS"
});

export interface BaseProcessAction {
  processId: string;
  type: string;
}

// FUNDING

// -------
// Actions
// -------

export interface StrategyProposed extends BaseProcessAction {
  type: "WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED";
  strategy: FundingStrategy;
}

export interface StrategyApproved extends BaseProcessAction {
  type: "WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED";
  strategy: FundingStrategy;
}
export interface ConcludeInstigated {
  type: "WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED";
  protocol: ProcessProtocol.Concluding;
  channelId: string;
}

// -------
// Constructors
// -------

export const strategyProposed: ActionConstructor<StrategyProposed> = p => ({
  ...p,
  type: "WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED"
});

export const strategyApproved: ActionConstructor<StrategyApproved> = p => ({
  ...p,
  type: "WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED"
});

export const concludeInstigated: ActionConstructor<ConcludeInstigated> = p => ({
  ...p,
  type: "WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED",
  protocol: ProcessProtocol.Concluding
});

// COMMON

// -------
// Actions
// -------

export interface SignedStatesReceived extends BaseProcessAction {
  type: "WALLET.COMMON.SIGNED_STATES_RECEIVED";
  protocolLocator: ProtocolLocator;
  signedStates: SignedState[];
}

// -------
// Constructors
// -------

export const signedStatesReceived = (p: {
  protocolLocator: ProtocolLocator;
  signedStates: SignedState[];
  processId: string;
}): SignedStatesReceived => ({
  ...p,
  type: "WALLET.COMMON.SIGNED_STATES_RECEIVED"
});

// -------
// Unions and Guards
// -------

export type RelayableAction =
  | StrategyProposed
  | StrategyApproved
  | ConcludeInstigated
  | SignedStatesReceived
  | CloseLedgerChannel
  | MultipleRelayableActions
  | ConcludeInstigated;

export function isRelayableAction(action): action is RelayableAction {
  return (
    "type" in action &&
    (action.type === "WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED" ||
      action.type === "WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED" ||
      action.type === "WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED" ||
      action.type === "WALLET.NEW_PROCESS.CLOSE_LEDGER_CHANNEL" ||
      action.type === "WALLET.COMMON.SIGNED_STATES_RECEIVED" ||
      action.type === "WALLET.MULTIPLE_RELAYABLE_ACTIONS")
  );
}

export type CommonAction = SignedStatesReceived;
export function isCommonAction(
  action: WalletAction,
  protocol?: EmbeddedProtocol
): action is CommonAction {
  return (
    action.type === "WALLET.COMMON.SIGNED_STATES_RECEIVED" &&
    // When passed a protocol, check that it's got the protocol in the protocol locator
    (!protocol || (action.protocolLocator && action.protocolLocator.indexOf(protocol) >= 0))
  );
}

export function routesToProtocol(
  action: WalletAction,
  protocolLocator: ProtocolLocator,
  descriptor: EmbeddedProtocol
): boolean {
  if ("protocolLocator" in action) {
    return action.protocolLocator.indexOf(descriptor) === protocolLocator.length;
  } else {
    return true;
  }
}

export function routerFactory<T extends WalletAction>(
  typeGuard: (action: WalletAction) => action is T,
  protocol: EmbeddedProtocol
): (action: WalletAction, protocolLocator: ProtocolLocator) => action is T {
  function router(action: WalletAction, protocolLocator: ProtocolLocator): action is T {
    return typeGuard(action) && routesToProtocol(action, protocolLocator, protocol);
  }

  return router;
}
