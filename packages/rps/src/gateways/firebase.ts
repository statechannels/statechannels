import * as firebase from 'firebase/app';

import 'firebase/database';

import ReduxSagaFirebase from 'redux-saga-firebase';

export const config =
  process.env.NODE_ENV === 'test'
    ? undefined
    : {
        apiKey: process.env.FIREBASE_API_KEY,
        databaseURL: process.env.FIREBASE_URL,
      };

const fire = firebase.initializeApp(config);

export const reduxSagaFirebase = new ReduxSagaFirebase(fire);

export default fire;

export const serverTimestamp = firebase.database.ServerValue.TIMESTAMP;
