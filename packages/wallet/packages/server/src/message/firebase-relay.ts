import * as firebaseApp from 'firebase/app';

import 'firebase/database';
import * as fetch from 'node-fetch';
import '../../config/env';
import { HUB_ADDRESS } from '../constants';

async function postData(data = {}) {
  const response = await fetch(`${process.env.SERVER_URL}/api/v2/channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return await response.json(); // parses response to JSON
}

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

function listenForHubMessages() {
  const hubRef = getMessagesRef().child(HUB_ADDRESS.toLowerCase());

  hubRef.on('child_added', snapshot => {
    const key = snapshot.key;
    const value = snapshot.val();
    postData({ ...value.payload, queue: value.queue });
    hubRef.child(key).remove();
  });
}

export function send(to, payload) {
  const fbPayload = { payload, queue: 'WALLET' };
  const sanitizedPayload = JSON.parse(JSON.stringify(fbPayload));
  getMessagesRef()
    .child(to.toLowerCase())
    .push(sanitizedPayload);
}

if (require.main === module) {
  console.log('Listening to firebase for hub messages');
  listenForHubMessages();
}
