import NitroAdjudicatorArtifact from '../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';
import TrivialAppArtifact from '../artifacts/contracts/TrivialApp.sol/TrivialApp.json';
import TokenArtifact from '../artifacts/contracts/Token.sol/Token.json';
import AssetHolderArtifact from '../artifacts/contracts/AssetHolder.sol/AssetHolder.json';
import Erc20AssetHolderArtifact from '../artifacts/contracts/ERC20AssetHolder.sol/ERC20AssetHolder.json';
import EthAssetHolderArtifact from '../artifacts/contracts/ETHAssetHolder.sol/ETHAssetHolder.json';

export const ContractArtifacts = {
  NitroAdjudicatorArtifact,
  TrivialAppArtifact, // TODO do we want to export this?
  Erc20AssetHolderArtifact,
  EthAssetHolderArtifact,
  TokenArtifact, // TODO do we want to export this?
  AssetHolderArtifact, // TODO do we want to export this?
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
  AssetTransferredEvent,
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
export {Signatures, Transactions};

// types
export {Uint256, Bytes32} from './contract/types';
