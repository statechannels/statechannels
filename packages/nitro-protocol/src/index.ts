import {State, hashState} from './contract/state';
import {Signature, BigNumberish} from 'ethers/utils';
import * as Signatures from './signatures';
import * as Transactions from './transactions';
import {encodeConsensusData} from './contract/consensus-data';
import {createDepositTransaction} from './contract/transaction-creators/eth-asset-holder';
import {Outcome, AllocationItem, hashOutcome} from './contract/outcome';
import {Channel} from './contract/channel';

export {Signatures, Transactions};

// TODO: Move these to their own interface files once they've stabilized
export interface SignedState {
  state: State;
  signature: Signature;
}

export interface ChannelStorage {
  turnNumRecord: BigNumberish;
  finalizesAt: BigNumberish;
  stateHash: string;
  challengerAddress: string;
  outcomeHash: string;
}

// TODO: Export this with more thought to what is exposed by @statchannels/nitro-protocol
export {createDepositTransaction, State, encodeConsensusData, Outcome, AllocationItem, Channel, hashOutcome, hashState};
