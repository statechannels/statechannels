import * as firebase from 'firebase';

import { Model } from 'objection';
import '../../config/env';
import { handleAppMessage } from '../app/handlers/handle-app-message';
import { handleWalletMessage } from '../app/handlers/handle-wallet-message';
import { HUB_ADDRESS } from '../constants';
import knex from '../wallet/db/connection';

// TODO: Currently the firebaseRelay is all that is needed to respond to the app
// If the REST endpoint is not being used it should probably be removed
Model.knex(knex);

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT}.firebaseapp.com`,
  databaseURL: `https://${process.env.FIREBASE_PROJECT}.firebaseio.com`,
  projectId: process.env.FIREBASE_PROJECT,
  storageBucket: '',
  messagingSenderId: '913007764573',
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
  return firebaseAppInsance.database().ref('messages');
}

function listenToFirebase() {
  const hubRef = getMessagesRef().child(HUB_ADDRESS.toLowerCase());

  hubRef.on('child_added', async snapshot => {
    const key = snapshot.key;
    const value = snapshot.val();
    const queue = value.queue;
    if (queue === 'GAME_ENGINE') {
      const outgoingMessage = await handleAppMessage(value);
      if (outgoingMessage) {
        // We assume we are always player B
        const to = outgoingMessage.commitment.channel.participants[0];
        sendToFirebase(to, outgoingMessage);
      }
    } else if (queue === 'WALLET') {
      const outgoingMessage = await handleWalletMessage({ ...value.payload });
      if (outgoingMessage) {
        sendToFirebase(outgoingMessage.to, outgoingMessage);
      }
    } else {
      throw new Error('Unknown queue');
    }

    hubRef.child(key).remove();
  });
}

export function sendToFirebase(destination, payload) {
  const sanitizedPayload = JSON.parse(JSON.stringify(payload));
  getMessagesRef()
    .child(destination.toLowerCase())
    .push(sanitizedPayload);
}

if (require.main === module) {
  console.log('Listening to firebase for hub messages');
  listenToFirebase();
}
