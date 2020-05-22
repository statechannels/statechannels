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

export function createTransferAllTransaction(
  assetHolderContractInterface: Interface,
  channelId: string,
  allocation: Allocation
): TransactionRequest {
  const data = assetHolderContractInterface.functions.transferAll.encode([
    channelId,
    encodeAllocation(allocation),
  ]);
  return {data};
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
  return {data};
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
  return {data};
}
