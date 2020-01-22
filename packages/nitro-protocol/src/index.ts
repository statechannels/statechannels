import {Signature} from 'ethers/utils';
import NitroAdjudicatorArtifact from '../build/contracts/NitroAdjudicator.json';
import TrivialAppArtifact from '../build/contracts/TrivialApp.json';
import TokenArtifact from '../build/contracts/Token.json';
import Erc20AssetHolderArtifact from '../build/contracts/ERC20AssetHolder.json';
import EthAssetHolderArtifact from '../build/contracts/ETHAssetHolder.json';
import ConsensusAppArtifact from '../build/contracts/ConsensusApp.json';

import {
  AssetOutcomeShortHand,
  getTestProvider,
  OutcomeShortHand,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContracts,
} from '../test/test-helpers';
import {
  getAssetTransferredEvent,
  getDepositedEvent,
  convertBytes32ToAddress,
  convertAddressToBytes32,
} from './contract/asset-holder';
import {getChallengeRegisteredEvent} from './contract/challenge';
import {Channel, getChannelId} from './contract/channel';
import {encodeConsensusData} from './contract/consensus-data';
import {validTransition, ForceMoveAppContractInterface} from './contract/force-move-app';
import {
  AllocationItem,
  encodeAllocation,
  encodeOutcome,
  Outcome,
  Allocation,
  isAllocationOutcome,
  isGuaranteeOutcome,
  AssetOutcome,
  GuaranteeAssetOutcome,
  AllocationAssetOutcome,
} from './contract/outcome';

import {State, VariablePart, getVariablePart} from './contract/state';
import {createDepositTransaction as createERC20DepositTransaction} from './contract/transaction-creators/erc20-asset-holder';
import {
  createDepositTransaction as createETHDepositTransaction,
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
// Export interface ChannelStorage {
//   TurnNumRecord: BigNumberish;
//   FinalizesAt: BigNumberish;
//   StateHash: string;
//   ChallengerAddress: string;
//   OutcomeHash: string;
// }

// TODO: Export this with more thought to what is exposed by @statchannels/nitro-protocol
export {
  Allocation,
  convertBytes32ToAddress,
  convertAddressToBytes32,
  createERC20DepositTransaction,
  createETHDepositTransaction,
  createTransferAllTransaction,
  State,
  ForceMoveAppContractInterface,
  encodeConsensusData,
  encodeAllocation,
  encodeOutcome,
  Outcome,
  AllocationItem,
  AllocationAssetOutcome,
  getChannelId,
  Channel,
  getAssetTransferredEvent,
  getChallengeRegisteredEvent,
  getDepositedEvent,
  getVariablePart,
  GuaranteeAssetOutcome,
  isAllocationOutcome,
  isGuaranteeOutcome,
  validTransition,
  VariablePart,
  // Test helpers -- TODO move these to devtools package
  AssetOutcome,
  AssetOutcomeShortHand,
  OutcomeShortHand,
  getTestProvider,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContracts,
};

// artifacts
export const ContractArtifacts = {
  NitroAdjudicatorArtifact,
  TrivialAppArtifact,
  Erc20AssetHolderArtifact,
  EthAssetHolderArtifact,
  TokenArtifact,
  ConsensusAppArtifact,
};
export const ContractAbis = {
  EthAssetHolder: ContractArtifacts.EthAssetHolderArtifact.abi,
};

// types
export {Uint256} from './contract/types';
