import {ethers} from 'ethers';
import {
  Allocation,
  encodeAllocation,
  Guarantee,
  encodeGuarantee,
  Outcome,
  hashOutcome,
} from '../outcome';
import {TransactionRequest} from 'ethers/providers';

// TODO: Currently we are setting some arbitrary gas limit
// to avoid issues with Ganache sendTransaction and parsing BN.js
// If we don't set a gas limit some transactions will fail
const GAS_LIMIT = 3000000;

export function createTransferAllTransaction(
  assetHolderContractInterface: ethers.utils.Interface,
  channelId: string,
  allocation: Allocation,
): TransactionRequest {
  const data = assetHolderContractInterface.functions.transferAll.encode([
    channelId,
    encodeAllocation(allocation),
  ]);
  return {data, gasLimit: GAS_LIMIT};
}

export function createClaimAllTransaction(
  assetHolderContractInterface: ethers.utils.Interface,
  channelId: string,
  guarantee: Guarantee,
  allocation: Allocation,
): TransactionRequest {
  const data = assetHolderContractInterface.functions.claimAll.encode([
    channelId,
    encodeGuarantee(guarantee),
    encodeAllocation(allocation),
  ]);
  return {data, gasLimit: GAS_LIMIT};
}

export function createSetOutcomeTransaction(
  assetHolderContractInterface: ethers.utils.Interface,
  channelId: string,
  outcome: Outcome,
): TransactionRequest {
  const data = assetHolderContractInterface.functions.setOutcome.encode([
    channelId,
    hashOutcome(outcome),
  ]);
  return {data, gasLimit: GAS_LIMIT};
}
