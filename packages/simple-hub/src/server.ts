import '../env'; // Note: importing this module has the side effect of modifying env vars

import * as Sentry from '@sentry/node';

if (process.env.RUNTIME_ENV) {
  Sentry.init({
    dsn: 'https://18f53d1daf144411b98547e2ac93a914@sentry.io/4410960',
    environment: process.env.RUNTIME_ENV
  });
}
import {fbObservable, sendReplies, deleteIncomingMessage} from './message/firebase-relay';
import {respondToMessage} from './wallet/respond-to-message';
import {map, tap, retryWhen} from 'rxjs/operators';
import {logger} from './logger';
import {depositsToMake} from './wallet/deposit';
import {Blockchain} from './blockchain/eth-asset-holder';
import {deserializeMessage} from './wallet/xstate-wallet-internals';
import {validateMessage} from '@statechannels/wire-format';

const log = logger();

export async function startServer() {
  fbObservable()
    .pipe(
      tap(({snapshotKey}) => deleteIncomingMessage(snapshotKey)),
      map(({snapshotKey, messageObj}) => ({
        snapshotKey,
        message: deserializeMessage(validateMessage(messageObj))
      })),
      map(({snapshotKey, message}) => ({
        snapshotKey,
        messageToSend: respondToMessage(message)
      })),
      map(({snapshotKey, messageToSend}) => ({
        snapshotKey,
        messageToSend,
        depositsToMake: depositsToMake(messageToSend)
      })),
      retryWhen(errors => errors.pipe(tap(error => log.error(error))))
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
          log.info('Deposited');
          await sendReplies(snapshotKey, messageToSend);
          log.info('Messages sent');
        } catch (e) {
          log.error(e);
        }
      },
      error => log.error(error),
      () => {
        log.info('Completed listening to Firebase');
      }
    );

  log.info(`Listening on database ${process.env.FIREBASE_URL}`);
}

if (require.main === module) {
  startServer();
}
