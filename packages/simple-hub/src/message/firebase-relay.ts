import * as firebase from 'firebase';
import {stateChanges, ListenEvent, object} from 'rxfire/database';

import {cFirebasePrefix, cHubParticipantId} from '../constants';
import {logger} from '../logger';
import {Message as WireMessage, validateMessage} from '@statechannels/wire-format';
import {map} from 'rxjs/operators';
import {Message, serializeMessage, deserializeMessage} from '../wallet/xstate-wallet-internals';
import * as _ from 'lodash/fp';
import {notContainsHubParticipantId} from '../utils';
import {tryCatch, chain, right, map as fpMap, toError} from 'fp-ts/lib/Either';
import {pipe} from 'fp-ts/lib/pipeable';

const log = logger();

let firebaseApp: firebase.app.App;
function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }
  firebaseApp = firebase.initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    databaseURL: process.env.FIREBASE_URL
  });

  const connectedRef = firebase.database().ref('.info/connected');
  object(connectedRef)
    .pipe(map(change => (change.snapshot.val() ? 'connected' : 'disconnected')))
    .subscribe(status => log.info(`FIREBASE ${status}`));

  return firebaseApp;
}

function getMessagesRef() {
  const firebaseAppInsance = getFirebaseApp();
  return firebaseAppInsance.database().ref(`${cFirebasePrefix}/messages`);
}

function fbSend(message: WireMessage) {
  return getMessagesRef()
    .child(message.recipient)
    .push(JSON.parse(JSON.stringify(message)));
}

export function fbObservable() {
  const hubRef = getMessagesRef().child(cHubParticipantId);
  return stateChanges(hubRef, [ListenEvent.added]).pipe(
    map(change => ({
      snapshotKey: change.snapshot.key,
      message: pipe(right(change.snapshot.val()), chain(isValidMessage), fpMap(deserializeMessage))
    }))
  );
}

function isValidMessage(messageObj) {
  return tryCatch(() => validateMessage(messageObj), toError);
}

// exported just for unit testing
export function messagesToSend(messageToSend: Message): WireMessage[] {
  const allParticipantsWithDups = messageToSend.signedStates
    .map(state => state.participants)
    .reduce((participantsSoFar, participants) => participantsSoFar.concat(participants), []);

  return _.uniqBy(p => p.participantId, allParticipantsWithDups)
    .filter(notContainsHubParticipantId)
    .map(participant =>
      serializeMessage(messageToSend, participant.participantId, cHubParticipantId)
    );
}

export async function sendReplies(messageToSend: Message) {
  log.info({messageToSend}, 'Responding with message');
  await Promise.all(messagesToSend(messageToSend).map(fbSend));
  log.info('Messages sent');
}

export async function deleteIncomingMessage(snapshotKey: string) {
  const hubRef = getMessagesRef().child(cHubParticipantId);
  await hubRef.child(snapshotKey).remove();
}
