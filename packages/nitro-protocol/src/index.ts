import pick from 'lodash.pick';

import FULLTokenArtifact from '../artifacts/contracts/Token.sol/Token.json';
import FULLNitroAdjudicatorArtifact from '../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';
import FULLErc20AssetHolderArtifact from '../artifacts/contracts/ERC20AssetHolder.sol/ERC20AssetHolder.json';
import FULLEthAssetHolderArtifact from '../artifacts/contracts/ETHAssetHolder.sol/ETHAssetHolder.json';
import FULLTestNitroAdjudicatorArtifact from '../artifacts/contracts/test/TESTNitroAdjudicator.sol/TESTNitroAdjudicator.json';
import FULLTestAssetHolderArtifact from '../artifacts/contracts/test/TESTAssetHolder.sol/TESTAssetHolder.json';

// https://hardhat.org/guides/compile-contracts.html#artifacts
const fields = [
  'contractName',
  'abi',
  'bytecode',
  'deployedByteCode',
  'linkReferences',
  'deployedLinkReferences',
];

interface MinimalArtifact {
  contractName: typeof FULLNitroAdjudicatorArtifact.contractName;
  abi: typeof FULLNitroAdjudicatorArtifact.abi;
  bytecode: typeof FULLNitroAdjudicatorArtifact.bytecode;
  deployedBytecode: typeof FULLNitroAdjudicatorArtifact.deployedBytecode;
  linkReferences: typeof FULLNitroAdjudicatorArtifact.linkReferences;
  deployedLinkReferences: typeof FULLNitroAdjudicatorArtifact.deployedLinkReferences;
}

export const ContractArtifacts = {
  NitroAdjudicatorArtifact: pick(FULLNitroAdjudicatorArtifact, fields) as MinimalArtifact,
  Erc20AssetHolderArtifact: pick(FULLErc20AssetHolderArtifact, fields) as MinimalArtifact,
  EthAssetHolderArtifact: pick(FULLEthAssetHolderArtifact, fields) as MinimalArtifact,
};

/*
 * Various test contract artifacts used for testing.
 * They expose helper functions to allow for easier testing.
 * They should NEVER be used in a production environment.
 */
export const TestContractArtifacts = {
  TestNitroAdjudicatorArtifact: pick(FULLTestNitroAdjudicatorArtifact, fields) as MinimalArtifact,
  TestAssetHolderArtifact: pick(FULLTestAssetHolderArtifact, fields) as MinimalArtifact,
  TokenArtifact: pick(FULLTokenArtifact, fields) as MinimalArtifact,
};

export {
  AssetOutcomeShortHand,
  getTestProvider,
  OutcomeShortHand,
  randomChannelId,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContracts,
} from '../test/test-helpers';
export {
  DepositedEvent,
  getDepositedEvent,
  convertBytes32ToAddress,
  convertAddressToBytes32,
} from './contract/asset-holder';
export {
  getChallengeRegisteredEvent,
  getChallengeClearedEvent,
  ChallengeRegisteredEvent,
} from './contract/challenge';
export {Channel, getChannelId, isExternalDestination} from './contract/channel';
export {
  validTransition,
  ForceMoveAppContractInterface,
  createValidTransitionTransaction,
} from './contract/force-move-app';
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

export {
  State,
  VariablePart,
  getVariablePart,
  getFixedPart,
  hashAppPart,
  hashState,
} from './contract/state';
export {createDepositTransaction as createERC20DepositTransaction} from './contract/transaction-creators/erc20-asset-holder';
export {
  createDepositTransaction as createETHDepositTransaction,
  createTransferAllTransaction,
} from './contract/transaction-creators/eth-asset-holder';

export {
  signState,
  getStateSignerAddress,
  signChallengeMessage,
  signStates,
  SignedState,
} from './signatures';

import * as Signatures from './signatures';
import * as Transactions from './transactions';
import {computePublicKey} from 'ethers/lib/utils';
import {Contract, ContractInterface} from 'ethers';
export {Signatures, Transactions};

// types
export {Uint256, Bytes32} from './contract/types';

// validTransition
export * from './valid-transition';
