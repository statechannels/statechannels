import {SiteBudget, AssetBudget} from '../store/types';
import {HUB_ADDRESS, ETH_ASSET_HOLDER_ADDRESS} from '../config';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';
import {checkThat, exists} from './helpers';

export function ethBudget(site: string, opts: Partial<AssetBudget>): SiteBudget {
  return {
    domain: site,
    hubAddress: HUB_ADDRESS,
    forAsset: {
      [ETH_ASSET_HOLDER_ADDRESS]: _.assign(
        {
          assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
          availableReceiveCapacity: bigNumberify(0),
          availableSendCapacity: bigNumberify(0),
          channels: {}
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

export function extractEthAssetBudget(budget: SiteBudget): AssetBudget {
  if (Object.keys(budget.forAsset).length !== 1) {
    throw new Error('Cannot handle mixed budget');
  }

  return checkThat<AssetBudget>(budget.forAsset[ETH_ASSET_HOLDER_ADDRESS], exists);
}
