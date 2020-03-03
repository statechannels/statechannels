import {AssetHolderWatcherEvent} from '../blockchain/asset-holder-watcher';
import {Blockchain} from '../blockchain/transaction';

export async function onDepositEvent(assetHolderEvent: AssetHolderWatcherEvent) {
  await Blockchain.fund(
    assetHolderEvent.channelId,
    assetHolderEvent.destinationHoldings,
    assetHolderEvent.amountDeposited
  );
}
