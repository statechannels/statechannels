import '../env'; // Note: importing this module has the side effect of modifying env vars

import * as Sentry from '@sentry/node';

if (process.env.RUNTIME_ENV) {
  Sentry.init({
    dsn: 'https://18f53d1daf144411b98547e2ac93a914@sentry.io/4410960',
    environment: process.env.RUNTIME_ENV
  });
}
import {fbObservable, deleteIncomingMessage, sendReplies} from './message/firebase-relay';
import {respondToMessage} from './wallet/respond-to-message';
import {map} from 'rxjs/operators';
import {log} from './logger';
import {depositsToMake} from './wallet/deposit';
import {makeDeposits} from './blockchain/eth-asset-holder';
import {pipe} from 'fp-ts/lib/pipeable';
import {map as fpMap, fold} from 'fp-ts/lib/Either';
import {cHubParticipantId, cFirebasePrefix} from './constants';

export async function startServer() {
  fbObservable()
    .pipe(
      map(({snapshotKey, message}) => ({
        snapshotKey,
        messageToSend: pipe(message, fpMap(respondToMessage))
      })),
      map(({snapshotKey, messageToSend}) => ({
        snapshotKey,
        messageToSend,
        depositsToMake: pipe(messageToSend, fpMap(depositsToMake))
      }))
    )
    .subscribe(
      async ({snapshotKey, messageToSend, depositsToMake}) => {
        try {
          deleteIncomingMessage(snapshotKey);
          pipe(depositsToMake, fold(log.error, makeDeposits));
          pipe(messageToSend, fold(log.error, sendReplies));
        } catch (e) {
          log.error(e);
        }
      },
      error => log.fatal(error),
      () => log.fatal('Completed listening to Firebase')
    );

  log.info(`Listening on database ${process.env.FIREBASE_URL}`);
  log.info(`Firebase prefix set to ${cFirebasePrefix}`);
  log.info(`Hub listening for messages sent to ${cHubParticipantId}`);
}

if (require.main === module) {
  startServer();
}
