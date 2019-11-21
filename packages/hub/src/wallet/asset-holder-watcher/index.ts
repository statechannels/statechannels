import {ethers} from 'ethers';
import {Uint256} from 'fmg-core';
import {ethAssetHolder as ethAssetHolderConstrutor} from '../utilities/blockchain';

/**
 * todos:
 * - wire up then other events.
 */

export enum AssetHolderWatcherEventType {
  Deposited
}

export interface AssetHolderWatcherEvent {
  eventType: AssetHolderWatcherEventType;
  channelId: string;
  amountDeposited: Uint256;
  destinationHoldings: Uint256;
}

export type AssetHolderEventHandler = (assetHolderEvent: AssetHolderWatcherEvent) => any;

export async function assetHolderListen(eventHandler: AssetHolderEventHandler) {
  console.log('asset-holder-watcher: listen');
  const ethAssetHolder: ethers.Contract = await ethAssetHolderConstrutor();
  const depositedFilter = ethAssetHolder.filters.Deposited();
  ethAssetHolder.on(depositedFilter, (channelId, amountDeposited, destinationHoldings) => {
    eventHandler({
      eventType: AssetHolderWatcherEventType.Deposited,
      channelId,
      amountDeposited: amountDeposited.toHexString(),
      destinationHoldings: destinationHoldings.toHexString()
    });
  });

  return () => {
    ethAssetHolder.removeAllListeners(depositedFilter);
  };
}
