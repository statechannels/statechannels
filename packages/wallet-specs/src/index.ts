export type AppData = string;
export type Signature = string;
export type Recipient = any;
export type Outcome = any[];
export type Address = string;
export type PrivateKey = string;

export interface ChannelState {
  turnNumber: number;
  outcome: Outcome;
  appData: AppData;
}

export interface SignedState {
  state: ChannelState;
  signatures?: Signature[];
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
