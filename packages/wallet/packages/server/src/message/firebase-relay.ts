import * as firebaseApp from 'firebase/app';

import 'firebase/database';
import * as fetch from 'node-fetch';
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

let firebase;
function getFirebaseInstance() {
  if (firebase) {
    return firebase;
  }
  firebase = firebaseApp.initializeApp(config);
  return firebase;
}

function getMessagesRef() {
  getFirebaseInstance();
  return firebase.database().ref('messages');
}

async function postToHub(data = {}) {
  const response = await fetch(`${process.env.SERVER_URL}/api/v1/channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return await response.json(); // parses response to JSON
}

function listenToFirebase() {
  const hubRef = getMessagesRef().child(HUB_ADDRESS.toLowerCase());

  hubRef.on('child_added', snapshot => {
    const key = snapshot.key;
    const value = snapshot.val();
    const queue = value.queue;
    if (queue === 'GAME_ENGINE') {
      postToHub(value);
    } else if (queue === 'WALLET') {
      postToHub({ ...value.payload, queue: value.queue });
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
