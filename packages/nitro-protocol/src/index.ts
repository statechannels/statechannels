/**
 * @packageDocumentation Smart contracts that implement nitro protocol for state channel networks on ethereum. Includes javascript and typescript support.
 *
 * @remarks
 *
 * Building your state channel application contract against our interface:
 *
 * ```solidity
 * pragma solidity ^0.7.0;
 * pragma experimental ABIEncoderV2;
 *
 * import '@statechannels/nitro-protocol/contracts/interfaces/IForceMoveApp.sol';
 * import '@statechannels/nitro-protocol/contracts/Outcome.sol';
 *
 * contract MyStateChannelApp is IForceMoveApp {
 *   function validTransition(
 *     VariablePart memory a,
 *     VariablePart memory b,
 *     uint256 turnNumB,
 *     uint256 nParticipants
 *   ) public override pure returns (bool) {

*     // Your logic ...
 *
 *     return true;
 *   }
 * }
 * ```
 *
 * Import precompiled artifacts for deployment/testing
 *
 * ```typescript
 * const {
 *   NitroAdjudicatorArtifact,
 *   TrivialAppArtifact,
 *   TokenArtifact,
 * } = require('@statechannels/nitro-protocol').ContractArtifacts;
 * ```
 *
 * Import typescript types
 *
 * ```typescript
 * import {Channel} from '@statechannels/nitro-protocol';
 *
 * const channel: Channel = {
 *   chainId: '0x1',
 *   channelNonce: 0,
 *   participants: ['0xalice...', '0xbob...'],
 * };
 * ```
 *
 * Import javascript helper functions
 *
 * ```typescript
 * import {getChannelId} from '@statechannels/nitro-protocol';
 *
 * const channelId = getChannelId(channel);
 * ```
 */

import pick from 'lodash.pick';

import FULLTokenArtifact from '../artifacts/contracts/Token.sol/Token.json';
import FULLNitroAdjudicatorArtifact from '../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';
import FULLTestNitroAdjudicatorArtifact from '../artifacts/contracts/test/TESTNitroAdjudicator.sol/TESTNitroAdjudicator.json';
import FULLCountingAppArtifact from '../artifacts/contracts/CountingApp.sol/CountingApp.json';
import FULLHashLockedSwapArtifact from '../artifacts/contracts/examples/HashLockedSwap.sol/HashLockedSwap.json';

// https://hardhat.org/guides/compile-contracts.html#artifacts
const fields = [
  'contractName',
  'abi',
  'bytecode',
  'deployedBytecode',
  'linkReferences',
  'deployedLinkReferences',
];

interface MinimalArtifact {
  contractName: string;
  abi: any;
  bytecode: string;
  deployedBytecode: string;
  linkReferences: any;
  deployedLinkReferences: any;
}

const minimize = artifact => pick(artifact, fields) as MinimalArtifact;

export const ContractArtifacts = {
  NitroAdjudicatorArtifact: minimize(FULLNitroAdjudicatorArtifact),
  HashLockedSwapArtifact: minimize(FULLHashLockedSwapArtifact),
};

/*
 * Various test contract artifacts used for testing.
 * They expose helper functions to allow for easier testing.
 * They should NEVER be used in a production environment.
 */
export const TestContractArtifacts = {
  CountingAppArtifact: minimize(FULLCountingAppArtifact),
  TestNitroAdjudicatorArtifact: minimize(FULLTestNitroAdjudicatorArtifact),
  TokenArtifact: minimize(FULLTokenArtifact),
};

export {
  AssetOutcomeShortHand,
  getTestProvider,
  OutcomeShortHand,
  randomChannelId,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
} from '../test/test-helpers';
export {
  DepositedEvent,
  getDepositedEvent,
  convertBytes32ToAddress,
  convertAddressToBytes32,
} from './contract/multi-asset-holder';
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
export {encodeOutcome, decodeOutcome, Outcome, AssetOutcome, hashOutcome} from './contract/outcome';
export {channelDataToStatus} from './contract/channel-storage';

export {
  State,
  VariablePart,
  getVariablePart,
  getFixedPart,
  hashAppPart,
  hashState,
} from './contract/state';

export * from './signatures';
export * from './transactions';
export {
  createERC20DepositTransaction,
  createETHDepositTransaction,
} from './contract/transaction-creators/multi-asset-holder';

// types
export {Uint256, Bytes32} from './contract/types';

// validTransition
export * from './valid-transition';

export * from './channel-mode';
