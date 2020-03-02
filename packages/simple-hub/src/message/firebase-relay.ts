import * as firebase from 'firebase';

import {cHubParticipantAddress, cFirebasePrefix} from '../constants';
import {logger} from '../logger';

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

export async function fbListen(callback) {
  log.info('firebase-relay: listen');
  const hubRef = getMessagesRef().child(cHubParticipantAddress);

  hubRef.on('child_added', async snapshot => {
    const key = snapshot.key;
    const value = snapshot.val();
    await callback(value.data);
    hubRef.child(key).remove();
  });
}

export function fbSend(message: string) {
  const sanitizedPayload = JSON.parse(JSON.stringify(message));
  // todo: how is the receipient pulled out?
  return getMessagesRef()
    .child('message.recipient')
    .push(sanitizedPayload);
}
