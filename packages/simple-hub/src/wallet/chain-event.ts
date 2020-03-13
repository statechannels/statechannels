import {AssetHolderEvent} from '../blockchain/asset-holder-watcher';
import {Blockchain} from '../blockchain/eth-asset-holder';
import {Observable} from 'rxjs';
import {logger} from '../logger';
import {filter} from 'rxjs/operators';

const log = logger();

export function attachToChainObservable(observable: Observable<AssetHolderEvent>) {
  log.info('attachToChainObservable: subscribe');
  return observable
    .pipe(
      filter(assetHolderEvent =>
        assetHolderEvent.amountDeposited.eq(assetHolderEvent.destinationHoldings)
      )
    )
    .subscribe(
      async assetHolderEvent => {
        await Blockchain.fund(
          assetHolderEvent.channelId,
          assetHolderEvent.destinationHoldings,
          assetHolderEvent.amountDeposited
        );
      },
      e => log.error(e),
      () => log.info('assetHolderObservable completed')
    );
}
