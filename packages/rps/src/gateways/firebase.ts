import * as firebase from 'firebase/app';

import 'firebase/database';

import ReduxSagaFirebase from 'redux-saga-firebase';

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  databaseURL: `https://${process.env.FIREBASE_PROJECT}.firebaseio.com`,
};

const fire = firebase.initializeApp(config);

export const reduxSagaFirebase = new ReduxSagaFirebase(fire);

export default fire;

export const serverTimestamp = firebase.database.ServerValue.TIMESTAMP;
