import {ethers} from 'ethers';
import {logger} from '../logger';
import {ethAssetHolder as attachEthAssetHolder} from './asset-holder';

const log = logger();

export enum AssetHolderWatcherEventType {
  Deposited
}

export interface AssetHolderWatcherEvent {
  channelId: string;
  amountDeposited: string;
  destinationHoldings: string;
  event: ethers.Event;
}

export type AssetHolderEventHandler = (assetHolderEvent: AssetHolderWatcherEvent) => any;
export type RemoveListeners = () => void;

export async function assetHolderListen(eventHandler: AssetHolderEventHandler) {
  log.info('asset-holder-watcher: listen');
  const ethAssetHolder: ethers.Contract = await attachEthAssetHolder();
  const depositedFilter = ethAssetHolder.filters.Deposited();
  ethAssetHolder.on(depositedFilter, (channelId, amountDeposited, destinationHoldings, event) => {
    eventHandler({
      channelId,
      amountDeposited: amountDeposited.toHexString(),
      destinationHoldings: destinationHoldings.toHexString(),
      event
    });
  });
}
