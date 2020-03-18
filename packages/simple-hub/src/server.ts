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
import {map} from 'rxjs/operators';
import {logger} from './logger';
import {depositsToMake} from './wallet/deposit';
import {Blockchain} from './blockchain/eth-asset-holder';
import {ethers} from 'ethers';

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
      }))
    )
    .subscribe(
      async ({snapshotKey, messageToSend, depositsToMake}) => {
        log.info({messageToSend}, 'Responding with message');
        await sendMessagesAndCleanup(snapshotKey, messageToSend);
        await Promise.all(
          depositsToMake.map(depositToMake =>
            Blockchain.fund(
              depositToMake.channelId,
              ethers.constants.Zero,
              depositToMake.amountToDeposit
            )
          )
        );
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
