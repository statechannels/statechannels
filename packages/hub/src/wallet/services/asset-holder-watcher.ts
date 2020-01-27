import {ethers} from 'ethers';
import {Address, Uint256} from '../../types';
import {ethAssetHolder as ethAssetHolderConstrutor} from '../utilities/blockchain';
import {logger} from '../../logger';

const log = logger();

/**
 * Todos:
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
export type RemoveListeners = () => void;

export async function assetHolderListen(
  eventHandler: AssetHolderEventHandler
): Promise<RemoveListeners> {
  log.info('asset-holder-watcher: listen');
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
