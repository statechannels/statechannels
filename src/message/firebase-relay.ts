import * as firebase from 'firebase';

import { MessageRelayRequested } from 'magmo-wallet-client';
import '../../config/env';
import { HUB_ADDRESS } from '../constants';

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

async function listen() {
  const hubRef = getMessagesRef().child(HUB_ADDRESS.toLowerCase());

  hubRef.on('child_added', async snapshot => {
    const key = snapshot.key;
    const value = snapshot.val();
    const queue = value.queue;
    if (queue === 'GAME_ENGINE') {
      throw new Error(
        `The hub does not support handling application commitments. Received ${JSON.stringify(
          value,
        )}`,
      );
    } else if (queue === 'WALLET') {
      initializeCommitmentArraysFromFirebase(value.payload);
      process.send(value.payload);
    } else {
      throw new Error('Unknown queue');
    }

    hubRef.child(key).remove();
  });
}

process.on('message', (message: MessageRelayRequested) => {
  const sanitizedPayload = JSON.parse(JSON.stringify(message.messagePayload));
  getMessagesRef()
    .child(message.to.toLowerCase())
    .push({ payload: sanitizedPayload, queue: 'WALLET' });
});

if (require.main === module) {
  console.log('Listening to firebase for hub messages');
  listen();
}

function initializeCommitmentArraysFromFirebase(payload) {
  const arraysToInitialize = ['allocation'];
  for (const arrayToInitialize of arraysToInitialize) {
    if ('commitment' in payload && !payload.commitment[arrayToInitialize]) {
      payload.commitment[arrayToInitialize] = [];
    }
  }

  for (const property of Object.keys(payload)) {
    if (typeof payload[property] === 'object') {
      initializeCommitmentArraysFromFirebase(payload[property]);
    }
  }
}
