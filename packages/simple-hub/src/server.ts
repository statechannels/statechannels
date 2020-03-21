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
import {map, retry} from 'rxjs/operators';
import {logger} from './logger';
import {depositsToMake} from './wallet/deposit';
import {Blockchain} from './blockchain/eth-asset-holder';

const log = logger();

export async function startServer() {
  fbObservable()
    .pipe(
      map(({snapshotKey, message}) => ({
        snapshotKey,
        messageToSend: respondToMessage(message)
      })),
      map(({snapshotKey, messageToSend}) => ({
        snapshotKey,
        messageToSend,
        depositsToMake: depositsToMake(messageToSend)
      })),
      retry()
    )
    .subscribe(
      async ({snapshotKey, messageToSend, depositsToMake}) => {
        try {
          log.info({messageToSend}, 'Responding with message');
          await Promise.all(
            depositsToMake.map(depositToMake => {
              log.info(`depositing ${depositToMake.amountToDeposit} to ${depositToMake.channelId}`);
              return Blockchain.fund(depositToMake.channelId, depositToMake.amountToDeposit);
            })
          );
          await sendMessagesAndCleanup(snapshotKey, messageToSend);
        } catch (e) {
          log.error(e);
        }
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
