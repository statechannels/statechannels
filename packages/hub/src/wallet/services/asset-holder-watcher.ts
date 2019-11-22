import {ethers} from 'ethers';
import {Address, Uint256} from 'fmg-core';
import {ethAssetHolder as ethAssetHolderConstrutor} from '../utilities/blockchain';
import {onDepositEvent} from './depositManager';

/**
 * todos:
 * - wire up then other events.
 */

export enum AssetHolderWatcherEventType {
  Deposited
}

export interface AssetHolderWatcherEvent {
  assetHolderAddress: Address;
  eventType: AssetHolderWatcherEventType;
  channelId: string;
  amountDeposited: Uint256;
  destinationHoldings: Uint256;
}

export type AssetHolderEventHandler = (assetHolderEvent: AssetHolderWatcherEvent) => any;

export async function assetHolderListen(eventHandler: AssetHolderEventHandler = onDepositEvent) {
  console.log('asset-holder-watcher: listen');
  const ethAssetHolder: ethers.Contract = await ethAssetHolderConstrutor();
  const depositedFilter = ethAssetHolder.filters.Deposited();
  ethAssetHolder.on(depositedFilter, (channelId, amountDeposited, destinationHoldings) => {
    eventHandler({
      assetHolderAddress: ethAssetHolder.address,
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
