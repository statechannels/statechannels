import * as firebase from 'firebase';

import {cFirebasePrefix, cHubParticipantId} from '../constants';
import {logger} from '../logger';
import {Message as WireMessage} from '@statechannels/wire-format';
import {fromEvent, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {deserializeMessage, Message, serializeMessage} from '../wallet/xstate-wallet-internals';
import * as _ from 'lodash/fp';
import {notContainsHubParticipantId} from '../utils';

type Snapshot = firebase.database.DataSnapshot;
type FirebaseEvent = [Snapshot, string | null];

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
  log.info('firebase-relay: listen');
  const hubRef = getMessagesRef().child(cHubParticipantId);
  const childAddedObservable: Observable<FirebaseEvent> = fromEvent(hubRef, 'child_added');
  return childAddedObservable.pipe(
    map(childAdded => childAdded[0]),
    map(snapshot => ({snapshotKey: snapshot.key, message: deserializeMessage(snapshot.val())}))
  );
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

export async function sendMessagesAndCleanup(snapshotKey: string, messageToSend: Message) {
  const hubRef = getMessagesRef().child(cHubParticipantId);
  await Promise.all(messagesToSend(messageToSend).map(fbSend));
  await hubRef.child(snapshotKey).remove();
}
