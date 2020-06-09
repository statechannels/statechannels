import {providers, utils} from 'ethers';
import {
  Allocation,
  encodeAllocation,
  encodeGuarantee,
  Guarantee,
  hashOutcome,
  Outcome,
} from '../outcome';

export function createTransferAllTransaction(
  assetHolderContractInterface: utils.Interface,
  channelId: string,
  allocation: Allocation
): providers.TransactionRequest {
  const data = assetHolderContractInterface.encodeFunctionData(
    assetHolderContractInterface.functions.transferAll,
    [channelId, encodeAllocation(allocation)]
  );
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
  assetHolderContractInterface: utils.Interface,
  channelId: string,
  guarantee: Guarantee,
  allocation: Allocation
): providers.TransactionRequest {
  const data = assetHolderContractInterface.encodeFunctionData(
    assetHolderContractInterface.functions.claimAll,
    claimAllArgs(channelId, guarantee, allocation)
  );
  return {data};
}

export function createSetOutcomeTransaction(
  assetHolderContractInterface: utils.Interface,
  channelId: string,
  outcome: Outcome
): providers.TransactionRequest {
  const data = assetHolderContractInterface.encodeFunctionData(
    assetHolderContractInterface.functions.setOutcome,
    [channelId, hashOutcome(outcome)]
  );
  return {data};
}
