import {State} from './contract/state';
import {Signature} from 'ethers/utils';
import * as Signatures from './signatures';
import * as Transactions from './transactions';
import {getAssetTransferredEvent, getDepositedEvent} from './contract/asset-holder';
import {encodeConsensusData} from './contract/consensus-data';
import {
  createDepositTransaction,
  createTransferAllTransaction,
} from './contract/transaction-creators/eth-asset-holder';
import {Outcome, AllocationItem} from './contract/outcome';
import {Channel, getChannelId} from './contract/channel';
import {getChallengeRegisteredEvent} from './contract/challenge';
import {isAllocationOutcome, isGuaranteeOutcome} from './contract/outcome';
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
  createTransferAllTransaction,
  State,
  encodeConsensusData,
  Outcome,
  AllocationItem,
  getChannelId,
  Channel,
  getAssetTransferredEvent,
  getChallengeRegisteredEvent,
  getDepositedEvent,
  isAllocationOutcome,
  isGuaranteeOutcome,
};
