import {TransactionRequest} from 'ethers/providers';
import {Interface} from 'ethers/utils';
import {
  Allocation,
  encodeAllocation,
  encodeGuarantee,
  Guarantee,
  hashOutcome,
  Outcome,
} from '../outcome';

// TODO: Currently we are setting some arbitrary gas limit
// To avoid issues with Ganache sendTransaction and parsing BN.js
// If we don't set a gas limit some transactions will fail
const GAS_LIMIT = 100_000;

export function createTransferAllTransaction(
  assetHolderContractInterface: Interface,
  channelId: string,
  allocation: Allocation
): TransactionRequest {
  const data = assetHolderContractInterface.functions.transferAll.encode([
    channelId,
    encodeAllocation(allocation),
  ]);
  return {data, gasLimit: GAS_LIMIT};
}

export function claimAllArgs(
  channelId: string,
  guarantee: Guarantee,
  allocation: Allocation
): any[] {
  return [channelId, encodeGuarantee(guarantee), encodeAllocation(allocation)];
}

export function createClaimAllTransaction(
  assetHolderContractInterface: Interface,
  channelId: string,
  guarantee: Guarantee,
  allocation: Allocation
): TransactionRequest {
  const data = assetHolderContractInterface.functions.claimAll.encode(
    claimAllArgs(channelId, guarantee, allocation)
  );
  return {data, gasLimit: GAS_LIMIT};
}

export function createSetOutcomeTransaction(
  assetHolderContractInterface: Interface,
  channelId: string,
  outcome: Outcome
): TransactionRequest {
  const data = assetHolderContractInterface.functions.setOutcome.encode([
    channelId,
    hashOutcome(outcome),
  ]);
  return {data, gasLimit: GAS_LIMIT};
}
