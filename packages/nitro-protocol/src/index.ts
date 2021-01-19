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
  'deployedBytecode',
  'linkReferences',
  'deployedLinkReferences',
];

type MinimalArtifact = Pick<
  typeof FULLNitroAdjudicatorArtifact,
  | 'contractName'
  | 'abi'
  | 'bytecode'
  | 'deployedBytecode'
  | 'linkReferences'
  | 'deployedLinkReferences'
>;

const minimize = artifact => pick(artifact, fields) as MinimalArtifact;

export const ContractArtifacts = {
  NitroAdjudicatorArtifact: minimize(FULLNitroAdjudicatorArtifact),
  Erc20AssetHolderArtifact: minimize(FULLErc20AssetHolderArtifact),
  EthAssetHolderArtifact: minimize(FULLEthAssetHolderArtifact),
};

/*
 * Various test contract artifacts used for testing.
 * They expose helper functions to allow for easier testing.
 * They should NEVER be used in a production environment.
 */
export const TestContractArtifacts = {
  TestNitroAdjudicatorArtifact: minimize(FULLTestNitroAdjudicatorArtifact),
  TestAssetHolderArtifact: minimize(FULLTestAssetHolderArtifact),
  TokenArtifact: minimize(FULLTokenArtifact),
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
export {channelDataToStatus} from './contract/channel-storage';

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
export {Signatures, Transactions};

// types
export {Uint256, Bytes32} from './contract/types';

// validTransition
export * from './valid-transition';

export * from './channel-mode';
