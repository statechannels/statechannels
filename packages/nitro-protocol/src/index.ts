import {Signature} from 'ethers/utils';
import {
  AssetOutcomeShortHand,
  getTestProvider,
  OutcomeShortHand,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContracts,
} from '../test/test-helpers';
import {getAssetTransferredEvent, getDepositedEvent} from './contract/asset-holder';
import {getChallengeRegisteredEvent} from './contract/challenge';
import {Channel, getChannelId} from './contract/channel';
import {encodeConsensusData} from './contract/consensus-data';
import {validTransition} from './contract/force-move-app';
import {AllocationItem, encodeAllocation, encodeOutcome, Outcome} from './contract/outcome';
import {Allocation, isAllocationOutcome, isGuaranteeOutcome} from './contract/outcome';
import {State, VariablePart} from './contract/state';
import {
  createETHDepositTransaction,
  createTransferAllTransaction,
} from './contract/transaction-creators/eth-asset-holder';
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
  Allocation,
  createETHDepositTransaction,
  createTransferAllTransaction,
  State,
  encodeConsensusData,
  encodeAllocation,
  encodeOutcome,
  Outcome,
  AllocationItem,
  getChannelId,
  Channel,
  getAssetTransferredEvent,
  getChallengeRegisteredEvent,
  getDepositedEvent,
  isAllocationOutcome,
  isGuaranteeOutcome,
  validTransition,
  VariablePart,
  // test helpers -- TODO move these to devtools package
  AssetOutcomeShortHand,
  OutcomeShortHand,
  getTestProvider,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContracts,
};
