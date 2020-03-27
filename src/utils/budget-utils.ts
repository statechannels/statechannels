import {SiteBudget, AssetBudget} from '../store/types';
import {HUB_ADDRESS, ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';
// import {checkThat} from '../utils';
// import {Workflow} from '../channel-wallet';

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
