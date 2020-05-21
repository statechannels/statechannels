import {deleteIncomingMessage, sendReplies} from '../message/firebase-relay';
import {respondToMessage} from '../wallet/respond-to-message';
import {map} from 'rxjs/operators';
import {log} from '../logger';
import {depositsToMake} from '../wallet/deposit';
import {makeDeposits} from '../blockchain/eth-asset-holder';
import {pipe} from 'fp-ts/lib/pipeable';
import {map as fpMap, fold, Either, getOrElse} from 'fp-ts/lib/Either';
import {Observable} from 'rxjs';
import {Message} from '../wallet/xstate-wallet-internals';

export function onIncomingMessage(
  observable: Observable<{
    snapshotKey: string;
    message: Either<Error, Message>;
  }>,
  onComplete?: () => void
) {
  return observable
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
          //await pipe(depositsToMake, fold(log.error, makeDeposits));
          await makeDeposits(getOrElse(() => [])(depositsToMake));
          pipe(messageToSend, fold(log.error, sendReplies));
        } catch (e) {
          log.error(e);
        }
      },
      error => log.fatal(error),
      () =>
        onComplete
          ? onComplete()
          : log.fatal('Completed listening to Firebase. This is not expected.')
    );
}
