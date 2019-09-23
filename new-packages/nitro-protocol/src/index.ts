import {State} from './contract/state';
import {Signature} from 'ethers/utils';
import * as Signatures from './signatures';
import * as Transactions from './transactions';

export {Signatures, Transactions};

// TODO: Move these to their own interface files once they've stabilized
export interface SignedState {
  state: State;
  signature: Signature;
}

export interface ChannelStorage {
  challengeState?: State;
  finalizesAt?: number;
  turnNumRecord: number;
}
