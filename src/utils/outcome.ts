import {AllocationItem, SimpleAllocation, Outcome} from '../store/types';
import {ETH_ASSET_HOLDER_ADDRESS} from '../constants';

export function isSimpleAllocation(outcome: Outcome): outcome is SimpleAllocation {
  return (
    outcome.type === 'SimpleAllocation' && outcome.assetHolderAddress === ETH_ASSET_HOLDER_ADDRESS
  );
}

export const simpleEthAllocation = (...allocationItems: AllocationItem[]): SimpleAllocation => ({
  type: 'SimpleAllocation',
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  allocationItems
});
