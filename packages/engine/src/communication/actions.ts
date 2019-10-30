import {SignedCommitment} from "../domain";
import {EngineAction} from "../redux/actions";
import {FundingStrategy, ProtocolLocator, EmbeddedProtocol} from "./index";
import {ProcessProtocol} from ".";
import {ActionConstructor} from "../redux/utils";
import {Commitments} from "../redux/channel-store";
import {CloseLedgerChannel} from "../redux/protocols/actions";

export interface MultipleRelayableActions {
  type: "ENGINE.MULTIPLE_RELAYABLE_ACTIONS";
  actions: RelayableAction[];
}

export const multipleRelayableActions: ActionConstructor<MultipleRelayableActions> = p => ({
  ...p,
  type: "ENGINE.MULTIPLE_RELAYABLE_ACTIONS"
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
  type: "ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED";
  strategy: FundingStrategy;
}

export interface StrategyApproved extends BaseProcessAction {
  type: "ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED";
  strategy: FundingStrategy;
}
export interface ConcludeInstigated {
  type: "ENGINE.NEW_PROCESS.CONCLUDE_INSTIGATED";
  protocol: ProcessProtocol.Concluding;
  channelId: string;
}

// -------
// Constructors
// -------

export const strategyProposed: ActionConstructor<StrategyProposed> = p => ({
  ...p,
  type: "ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED"
});

export const strategyApproved: ActionConstructor<StrategyApproved> = p => ({
  ...p,
  type: "ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED"
});

export const concludeInstigated: ActionConstructor<ConcludeInstigated> = p => ({
  ...p,
  type: "ENGINE.NEW_PROCESS.CONCLUDE_INSTIGATED",
  protocol: ProcessProtocol.Concluding
});

// COMMON

// -------
// Actions
// -------

// Protocols should switch to CommitmentsReceived, as we will in general
// need to support n-party channels, and that is easiest to manage by
// sending a full round of commitments when possible ie. when not in PreFundSetup

export interface CommitmentReceived extends BaseProcessAction {
  type: "ENGINE.COMMON.COMMITMENT_RECEIVED";
  signedCommitment: SignedCommitment;
  protocolLocator: ProtocolLocator;
}

export interface CommitmentsReceived extends BaseProcessAction {
  type: "ENGINE.COMMON.COMMITMENTS_RECEIVED";
  protocolLocator: ProtocolLocator;
  signedCommitments: Commitments;
}

// -------
// Constructors
// -------

export const commitmentReceived: ActionConstructor<CommitmentReceived> = p => ({
  ...p,
  type: "ENGINE.COMMON.COMMITMENT_RECEIVED"
});

export const commitmentsReceived: ActionConstructor<CommitmentsReceived> = p => ({
  ...p,
  type: "ENGINE.COMMON.COMMITMENTS_RECEIVED"
});

// -------
// Unions and Guards
// -------

export type RelayableAction =
  | StrategyProposed
  | StrategyApproved
  | ConcludeInstigated
  | CommitmentReceived
  | CommitmentsReceived
  | CloseLedgerChannel
  | MultipleRelayableActions
  | ConcludeInstigated;

export function isRelayableAction(action: EngineAction): action is RelayableAction {
  return (
    action.type === "ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED" ||
    action.type === "ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED" ||
    action.type === "ENGINE.NEW_PROCESS.CONCLUDE_INSTIGATED" ||
    action.type === "ENGINE.COMMON.COMMITMENT_RECEIVED" ||
    action.type === "ENGINE.NEW_PROCESS.CLOSE_LEDGER_CHANNEL" ||
    action.type === "ENGINE.COMMON.COMMITMENTS_RECEIVED" ||
    action.type === "ENGINE.MULTIPLE_RELAYABLE_ACTIONS"
  );
}

export type CommonAction = CommitmentReceived | CommitmentsReceived;
export function isCommonAction(action: EngineAction, protocol?: EmbeddedProtocol): action is CommonAction {
  return (
    (action.type === "ENGINE.COMMON.COMMITMENTS_RECEIVED" || action.type === "ENGINE.COMMON.COMMITMENT_RECEIVED") &&
    // When passed a protocol, check that it's got the protocol in the protocol locator
    (!protocol || (action.protocolLocator && action.protocolLocator.indexOf(protocol) >= 0))
  );
}

export function routesToProtocol(
  action: EngineAction,
  protocolLocator: ProtocolLocator,
  descriptor: EmbeddedProtocol
): boolean {
  if ("protocolLocator" in action) {
    return action.protocolLocator.indexOf(descriptor) === protocolLocator.length;
  } else {
    return true;
  }
}

export function routerFactory<T extends EngineAction>(
  typeGuard: (action: EngineAction) => action is T,
  protocol: EmbeddedProtocol
): (action: EngineAction, protocolLocator: ProtocolLocator) => action is T {
  function router(action: EngineAction, protocolLocator: ProtocolLocator): action is T {
    return typeGuard(action) && routesToProtocol(action, protocolLocator, protocol);
  }

  return router;
}
