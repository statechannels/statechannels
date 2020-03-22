import {SiteBudget, AssetBudget} from '../store/types';
import {HUB_ADDRESS, ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';

export function ethBudget(site: string, opts: Partial<AssetBudget>): SiteBudget {
  return {
    site,
    hubAddress: HUB_ADDRESS,
    forAsset: {
      [ETH_ASSET_HOLDER_ADDRESS]: _.assign(
        {
          assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
          free: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)},
          inUse: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)},
          pending: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)},
          direct: {playerAmount: bigNumberify(0), hubAmount: bigNumberify(0)}
        },
        opts
      )
    }
  };
}

export function forEthAsset(budget: SiteBudget): AssetBudget {
  const ethPart = budget.forAsset[ETH_ASSET_HOLDER_ADDRESS];
  if (!ethPart) throw 'No eth part!';
  return ethPart;
}
