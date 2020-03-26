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

// TODO: Delete if not using
// export async function calculateBudgetForLedgerChannel(
//   ledgerEntry: ChannelStoreEntry,
//   workflows: Workflow[],
//   player: Participant,
//   hub: Participant
// ): Promise<SiteBudget> {
//   if (!ledgerEntry.applicationSite) {
//     throw new Error('Cannot craft a budget for a channel without an applicationSite');
//   }
//   const ledgerAllocation = checkThat(ledgerEntry.supported.outcome, isSimpleEthAllocation);
//   const availableReceiveCapacity =
//     ledgerAllocation.allocationItems.find(a => a.destination === hub.destination)?.amount ||
//     bigNumberify(0);
//   const availableSendCapacity =
//     ledgerAllocation.allocationItems.find(a => a.destination === player.destination)?.amount ||
//     bigNumberify(0);

//     workflows[0].machine.state.context.

//   return {
//     hubAddress: hub.signingAddress,
//     domain: ledgerEntry.applicationSite,
//     forAsset: {
//       ETH_ASSET_HOLDER_ADDRESS: {
//         assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
//         availableReceiveCapacity,
//         availableSendCapacity,
//         ch
//       }
//     }
//   };
// }
