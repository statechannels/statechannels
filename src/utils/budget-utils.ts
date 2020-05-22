import {DomainBudget, AssetBudget} from '../store/types';
import {HUB_ADDRESS, ETH_ASSET_HOLDER_ADDRESS} from '../config';
import {BigNumber} from 'ethers';
import _ from 'lodash';
import {checkThat, exists} from './helpers';

export function ethBudget(domain: string, opts: Partial<AssetBudget>): DomainBudget {
  return {
    domain,
    hubAddress: HUB_ADDRESS,
    forAsset: {
      [ETH_ASSET_HOLDER_ADDRESS]: _.assign(
        {
          assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
          availableReceiveCapacity: BigNumber.from(0),
          availableSendCapacity: BigNumber.from(0),
          channels: {}
        },
        opts
      )
    }
  };
}

export function forEthAsset(budget: DomainBudget): AssetBudget {
  const ethPart = budget.forAsset[ETH_ASSET_HOLDER_ADDRESS];
  if (!ethPart) throw 'No eth part!';
  return ethPart;
}

export function extractEthAssetBudget(budget: DomainBudget): AssetBudget {
  if (Object.keys(budget.forAsset).length !== 1) {
    throw new Error('Cannot handle mixed budget');
  }

  return checkThat<AssetBudget>(budget.forAsset[ETH_ASSET_HOLDER_ADDRESS], exists);
}
