import * as firebase from 'firebase';

import {cHubStateChannelAddress, cFirebasePrefix} from '../constants';
import {logger} from '../logger';
import {Message} from '@statechannels/wire-format';
import {fromEvent, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

type Snapshot = firebase.database.DataSnapshot;
type FirebaseEvent = [Snapshot, string | null];

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

export function fbListen(responseForMessage: (message: Message) => Message[]) {
  log.info('firebase-relay: listen');
  const hubRef = getMessagesRef().child(cHubStateChannelAddress);

  const childAddedObservable: Observable<FirebaseEvent> = fromEvent(hubRef, 'child_added');

  childAddedObservable
    .pipe(
      map(childAdded => childAdded[0]),
      map(snapshot => ({snapshot, messagesToSend: responseForMessage(snapshot.val())}))
    )
    .subscribe(
      async ({snapshot, messagesToSend}) => {
        await Promise.all(messagesToSend.map(fbSend));
        await hubRef.child(snapshot.key).remove();
      },
      error => log.error(error),
      () => {
        log.info('Completed listening to Firebase');
      }
    );
}

function fbSend(message: Message) {
  return getMessagesRef()
    .child(message.recipient)
    .push(JSON.parse(JSON.stringify(message)));
}
