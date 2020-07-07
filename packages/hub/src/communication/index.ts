import {SignedState, getChannelId} from '@statechannels/nitro-protocol';

// todo: these definitions are duplicated from wallet and should eventually be defined elsewhere
export interface ChannelParticipant {
  participantId?: string;
  signingAddress: string;
  destination?: string;
}

export interface BaseProcessAction {
  processId: string;
  type: string;
}

export interface ChannelOpen {
  type: 'Channel.Open';
  signedState: SignedState;
  participants: ChannelParticipant[];
}

export interface ChannelJoined {
  type: 'Channel.Joined';
  signedState: SignedState;
  participants: ChannelParticipant[];
}

export interface CloseLedgerChannel {
  type: 'WALLET.NEW_PROCESS.CLOSE_LEDGER_CHANNEL';
  channelId: string;
  protocol: ProcessProtocol.CloseLedgerChannel;
}

export interface MultipleRelayableActions {
  type: 'WALLET.MULTIPLE_RELAYABLE_ACTIONS';
  actions: RelayableAction[];
}

export interface StrategyProposed extends BaseProcessAction {
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED';
  strategy: FundingStrategy;
}

export interface StrategyApproved extends BaseProcessAction {
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED';
  strategy: FundingStrategy;
}
export interface ConcludeInstigated {
  type: 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED';
  protocol: ProcessProtocol.Concluding;
  channelId: string;
}

export interface SignedStatesReceived extends BaseProcessAction {
  type: 'WALLET.COMMON.SIGNED_STATES_RECEIVED';
  protocolLocator: ProtocolLocator;
  signedStates: SignedState[];
}

export type RelayableAction =
  | ChannelOpen
  | ChannelJoined
  | StrategyProposed
  | StrategyApproved
  | ConcludeInstigated
  | SignedStatesReceived
  | CloseLedgerChannel
  | MultipleRelayableActions
  | ConcludeInstigated;

export type ActionConstructor<T> = (p: Pick<T, Exclude<keyof T, 'type' | 'protocol'>>) => T;

export interface RelayActionWithMessage {
  recipient: string;
  sender: string;
  data: RelayableAction;
}

export const channelJoined = (p: {
  signedState: SignedState;
  participants: ChannelParticipant[];
}): ChannelJoined => ({...p, type: 'Channel.Joined'});

export const signedStatesReceived = (p: {
  protocolLocator: ProtocolLocator;
  signedStates: SignedState[];
  processId: string;
}): SignedStatesReceived => ({
  ...p,
  type: 'WALLET.COMMON.SIGNED_STATES_RECEIVED'
});

export const relayActionWithMessage: ActionConstructor<RelayActionWithMessage> = p => ({
  ...p,

  type: 'WALLET.RELAY_ACTION_WITH_MESSAGE'
});

export const strategyApproved: ActionConstructor<StrategyApproved> = p => ({
  ...p,
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED'
});

// These protocols are precisely those that run at the top-level
export const enum ProcessProtocol {
  Application = 'Application',
  Funding = 'Funding',
  Concluding = 'Concluding',
  CloseLedgerChannel = 'CloseLedgerChannel'
}

export const enum EmbeddedProtocol {
  AdvanceChannel = 'AdvanceChannel',
  ConsensusUpdate = 'ConsensusUpdate',
  DirectFunding = 'DirectFunding', // TODO: Post-fund-setup exchange will be removed from direct funding, so this should be removed
  ExistingLedgerFunding = 'ExistingLedgerFunding',
  LedgerDefunding = 'LedgerDefunding',
  LedgerFunding = 'LedgerFunding',
  LedgerTopUp = 'LedgerTopUp',
  NewLedgerChannel = 'NewLedgerChannel',
  VirtualFunding = 'VirtualFunding',
  FundingStrategyNegotiation = 'FundingStrategyNegotiation',
  VirtualDefunding = 'VirtualDefunding',
  Defunding = 'Defunding'
}

export type ProtocolLocator = EmbeddedProtocol[];
export type FundingStrategy = 'IndirectFundingStrategy' | 'VirtualFundingStrategy';

export type StartProcessAction = ConcludeInstigated;

export function isStartProcessAction(a: {type: string}): a is StartProcessAction {
  return a.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED';
}

export function isChannelOpenAction(a: RelayableAction): a is ChannelOpen {
  return a.type === 'Channel.Open';
}

export function getProcessId(action: ChannelOpen | SignedStatesReceived) {
  if (isChannelOpenAction(action)) {
    const processId = getChannelId(action.signedState.state.channel);
    return `Funding-${processId}`;
  }
  return action.processId;
}
