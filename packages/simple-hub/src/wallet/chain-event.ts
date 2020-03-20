import {AssetHolderEvent} from '../blockchain/eth-asset-holder-watcher';
import {Blockchain} from '../blockchain/eth-asset-holder';
import {Observable} from 'rxjs';
import {logger} from '../logger';
import {filter} from 'rxjs/operators';

const log = logger();

export function subscribeToEthAssetHolder(observable: Observable<AssetHolderEvent>) {
  log.info('subscribeToEthAssetHolder: subscribing');
  return observable
    .pipe(
      filter(assetHolderEvent =>
        assetHolderEvent.amountDeposited.eq(assetHolderEvent.destinationHoldings)
      )
    )
    .subscribe(
      async assetHolderEvent => {
        await Blockchain.fund(assetHolderEvent.channelId, assetHolderEvent.amountDeposited);
      },
      e => log.error(e),
      () => log.info('assetHolderObservable completed')
    );
}
