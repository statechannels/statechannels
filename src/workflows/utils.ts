import {GuardPredicate} from 'xstate';
import {
  Outcome,
  AssetOutcome,
  isAllocationOutcome,
  Allocation
} from '@statechannels/nitro-protocol';

export function createMockGuard(guardName: string): GuardPredicate<any, any> {
  return {
    name: guardName,
    predicate: () => true,
    type: 'xstate.guard'
  };
}
// TODO: Merge wallet-protocols/xstate-wallet so these are shared
export function getEthAllocation(outcome: Outcome, ethAssetHolderAddress: string): Allocation {
  const ethOutcome: AssetOutcome | undefined = outcome.find(
    o => o.assetHolderAddress === ethAssetHolderAddress
  );
  return ethOutcome ? checkThat(ethOutcome, isAllocationOutcome).allocation : [];
}
type TypeGuard<T, S> = (t1: T | S) => t1 is T;
export function checkThat<T, S>(t: T | S, isTypeT: TypeGuard<T, S>): T {
  if (!isTypeT(t)) {
    throwError(isTypeT, t);
    // Typescrypt doesn't know that throwError throws an error.
    throw 'Unreachable';
  }
  return t;
}
const throwError = (fn: (t1: any) => boolean, t) => {
  throw new Error(`not valid, ${fn.name} failed on ${t}`);
};
