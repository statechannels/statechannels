import '../env'; // Note: importing this module has the side effect of modifying env vars

import * as Sentry from '@sentry/node';

if (process.env.RUNTIME_ENV) {
  Sentry.init({
    dsn: 'https://18f53d1daf144411b98547e2ac93a914@sentry.io/4410960',
    environment: process.env.RUNTIME_ENV
  });
}
import {fbObservable, sendMessagesAndCleanup} from './message/firebase-relay';
import {respondToMessage} from './wallet/respond-to-message';
import {ethAssetHolderObservable} from './blockchain/eth-asset-holder-watcher';
import {subscribeToEthAssetHolder} from './wallet/chain-event';
import {map} from 'rxjs/operators';
import {logger} from './logger';

const log = logger();

export async function startServer() {
  subscribeToEthAssetHolder(await ethAssetHolderObservable());

  fbObservable()
    .pipe(
      map(({snapshotKey, message}) => ({
        snapshotKey,
        messageToSend: respondToMessage(message)
      }))
    )
    .subscribe(
      async ({snapshotKey, messageToSend}) => {
        log.info({messageToSend}, 'Responding with message');
        await sendMessagesAndCleanup(snapshotKey, messageToSend);
      },
      error => log.error(error),
      () => {
        log.info('Completed listening to Firebase');
      }
    );
}

if (require.main === module) {
  startServer();
}
