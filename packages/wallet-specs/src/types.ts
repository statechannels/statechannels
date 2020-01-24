import { Outcome, State } from '@statechannels/nitro-protocol';
import { Signature } from 'ethers/utils';
export interface Balance {
  address: string;
  wei: string;
}
export interface VariablePart {
  turnNum: number;
  outcome: Outcome;
  isFinal: boolean;
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
