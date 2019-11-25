export type AppData = string;
export type Signature = string;
export type Recipient = any;
export interface OutcomeItem {
  destination: string;
  amount: string;
}
export type Outcome = OutcomeItem[];
export type Address = string;
export type PrivateKey = string;

export interface State {
  turnNum: number;
  outcome: Outcome;
  appData?: AppData;
  appDefinition?: string;
  channel: Channel;
  challengeDuration: string;
  isFinal: boolean;
}

export interface Channel {
  channelNonce: string;
  participants: Address[];
  chainId: string;
}

export function getChannelID(channel: Channel) {
  return JSON.stringify(channel);
}

export interface SignedState {
  state: State;
  signatures: Signature[];
}

export interface Failure {
  value: 'failure';
  context: {
    reason: string;
  };
}

export interface Entry {
  type: '';
}

export { chain } from './chain';
export { store, Store } from './store';
