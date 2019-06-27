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

export function initFirebase() {
  return firebaseApp.initializeApp(config);
}

function listenForHubMessages() {
  const firebase = initFirebase();
  const ref = firebase.database().ref(`/messages/${HUB_ADDRESS.toLowerCase()}/`);

  ref.on('child_added', snapshot => {
    const key = snapshot.key;
    const value = snapshot.val();
    postData({ ...value.payload, queue: value.queue });
    ref.child(key).remove();
  });
}

if (require.main === module) {
  listenForHubMessages();
}
