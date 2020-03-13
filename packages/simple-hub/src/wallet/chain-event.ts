import {AssetHolderEvent} from '../blockchain/asset-holder-watcher';
import {Blockchain} from '../blockchain/transaction';
import {Observable} from 'rxjs';
import {logger} from '../logger';
import {filter} from 'rxjs/operators';

const log = logger();

export function attachToChainObservable(observable: Observable<AssetHolderEvent>) {
  observable
    .pipe(
      filter(
        assetHolderEvent =>
          assetHolderEvent.amountDeposited === assetHolderEvent.destinationHoldings
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
