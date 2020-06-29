import NitroAdjudicatorArtifact from '../build/contracts/NitroAdjudicator.json';
import TrivialAppArtifact from '../build/contracts/TrivialApp.json';
import TokenArtifact from '../build/contracts/Token.json';
import Erc20AssetHolderArtifact from '../build/contracts/ERC20AssetHolder.json';
import EthAssetHolderArtifact from '../build/contracts/ETHAssetHolder.json';
import ConsensusAppArtifact from '../build/contracts/ConsensusApp.json';

export const ContractArtifacts = {
  NitroAdjudicatorArtifact,
  TrivialAppArtifact,
  Erc20AssetHolderArtifact,
  EthAssetHolderArtifact,
  TokenArtifact,
  ConsensusAppArtifact,
};

export {
  getAssetTransferredEvent,
  getDepositedEvent,
  convertBytes32ToAddress,
  convertAddressToBytes32,
} from './contract/asset-holder';
export {
  getChallengeRegisteredEvent,
  getChallengeClearedEvent,
  ChallengeRegisteredEvent,
} from './contract/challenge';
export {Channel, getChannelId} from './contract/channel';
export {encodeConsensusData, decodeConsensusData, ConsensusData} from './contract/consensus-data';
export {validTransition, ForceMoveAppContractInterface} from './contract/force-move-app';
export {
  encodeAllocation,
  encodeOutcome,
  decodeOutcome,
  Outcome,
  Allocation,
  AllocationItem,
  Guarantee,
  isAllocationOutcome,
  isGuaranteeOutcome,
  encodeGuarantee,
  AssetOutcome,
  GuaranteeAssetOutcome,
  AllocationAssetOutcome,
  hashOutcome,
} from './contract/outcome';
export {channelDataToChannelStorageHash} from './contract/channel-storage';

export {State, VariablePart, getVariablePart, getFixedPart, hashAppPart} from './contract/state';
export {createDepositTransaction as createERC20DepositTransaction} from './contract/transaction-creators/erc20-asset-holder';
export {
  createDepositTransaction as createETHDepositTransaction,
  createTransferAllTransaction,
} from './contract/transaction-creators/eth-asset-holder';

// TODO: Move these to their own interface files once they've stabilized
import {State} from './contract/state';
export {hashState} from './contract/state';

import {Signature} from 'ethers/utils';
export {signState, getStateSignerAddress, signChallengeMessage, signStates} from './signatures';

import * as Signatures from './signatures';
import * as Transactions from './transactions';
export {Signatures, Transactions};
export interface SignedState {
  state: State;
  signature: Signature;
}

// types
export {Uint256, Bytes32} from './contract/types';
