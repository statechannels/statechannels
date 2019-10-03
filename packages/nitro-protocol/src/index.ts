import {Signature} from 'ethers/utils';
import {getChallengeRegisteredEvent} from './contract/challenge';
import {Channel, getChannelId} from './contract/channel';
import {encodeConsensusData} from './contract/consensus-data';
import {AllocationItem, Outcome} from './contract/outcome';
import {isAllocationOutcome, isGuaranteeOutcome} from './contract/outcome';
import {State} from './contract/state';
import {createDepositTransaction} from './contract/transaction-creators/eth-asset-holder';
import * as Signatures from './signatures';
import * as Transactions from './transactions';
export {Signatures, Transactions};

// TODO: Move these to their own interface files once they've stabilized
export interface SignedState {
  state: State;
  signature: Signature;
}

// TODO: Find a use case for this or remove.
// @nsario I don't think we need this here -- it should be in the adjudicator state of the wallet
// export interface ChannelStorage {
//   turnNumRecord: BigNumberish;
//   finalizesAt: BigNumberish;
//   stateHash: string;
//   challengerAddress: string;
//   outcomeHash: string;
// }

// TODO: Export this with more thought to what is exposed by @statchannels/nitro-protocol
export {
  createDepositTransaction,
  State,
  encodeConsensusData,
  Outcome,
  AllocationItem,
  getChannelId,
  Channel,
  getChallengeRegisteredEvent,
  isAllocationOutcome,
  isGuaranteeOutcome,
};
