import {
  Outcome,
  AssetOutcome,
  isAllocationOutcome,
  AllocationAssetOutcome
} from '@statechannels/nitro-protocol';
import {Allocations as TokenAllocations} from '@statechannels/client-api-schema';

import {ETH_TOKEN} from '../constants';

// TODO: Merge wallet-protocols/xstate-wallet so these are shared
export function getEthAllocation(
  outcome: Outcome,
  ethAssetHolderAddress: string
): TokenAllocations {
  const ethOutcome: AssetOutcome | undefined = outcome.find(
    o => o.assetHolderAddress === ethAssetHolderAddress
  );
  if (!ethOutcome) {
    return [];
  }
  return [
    {
      token: ETH_TOKEN,
      allocationItems: checkThat(ethOutcome, isAllocationOutcome).allocationItems
    }
  ];
}

type TypeGuard<T, S> = (t1: T | S) => t1 is T;
export function checkThat<T, S>(t: T | S, isTypeT: TypeGuard<T, S>): T {
  if (!isTypeT(t)) {
    throwError(isTypeT, t);
    // Typescript doesn't know that throwError throws an error.
    throw 'Unreachable';
  }
  return t;
}
const throwError = (fn: (t1: any) => boolean, t) => {
  throw new Error(`not valid, ${fn.name} failed on ${t}`);
};

export function ethAllocationOutcome(
  allocations: TokenAllocations,
  ethAssetHolderAddress: string
): AllocationAssetOutcome[] {
  const ethAllocation = allocations.find(e => e.token === ETH_TOKEN);
  if (!ethAllocation) {
    return [];
  }
  return [
    {
      assetHolderAddress: ethAssetHolderAddress,
      allocationItems: ethAllocation.allocationItems
    }
  ];
}
