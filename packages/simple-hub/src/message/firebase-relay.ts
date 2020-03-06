import * as firebase from 'firebase';

import {cHubStateChannelAddress, cFirebasePrefix} from '../constants';
import {logger} from '../logger';
import {Message} from '@statechannels/wire-format';
import {fromEvent, Observable} from 'rxjs';
import {flatMap} from 'rxjs/operators';

export type Snapshot = firebase.database.DataSnapshot;

const log = logger();

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT}.firebaseapp.com`,
  databaseURL: `https://${process.env.FIREBASE_PROJECT}.firebaseio.com`,
  projectId: process.env.FIREBASE_PROJECT,
  storageBucket: '',
  messagingSenderId: '913007764573'
};

let firebaseApp: firebase.app.App;
function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }
  firebaseApp = firebase.initializeApp(config);
  return firebaseApp;
}

function getMessagesRef() {
  const firebaseAppInsance = getFirebaseApp();
  return firebaseAppInsance.database().ref(`${cFirebasePrefix}/messages`);
}

export async function fbListen(onChildAdded) {
  log.info('firebase-relay: listen');
  const hubRef = getMessagesRef().child(cHubStateChannelAddress);

  const childAddedObservable: Observable<Snapshot> = fromEvent(hubRef, 'child_added');
  childAddedObservable.pipe(
    flatMap(onChildAdded),
    flatMap(async (snapshot: Snapshot) => await hubRef.child(snapshot.key).remove())
  );
}

export function fbSend(message: Message) {
  const sanitizedPayload = JSON.parse(JSON.stringify(message));
  // todo: how is the receipient pulled out?
  return getMessagesRef()
    .child(message.recipient)
    .push(sanitizedPayload);
}
