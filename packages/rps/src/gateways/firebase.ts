import * as firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';

import ReduxSagaFirebase from 'redux-saga-firebase';

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  databaseURL: `https://${process.env.FIREBASE_PROJECT}.firebaseio.com`,
};

const fire = firebase.initializeApp(config);
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
export const reduxSagaFirebase = new ReduxSagaFirebase(fire);
export const authProvider = new firebase.auth.GoogleAuthProvider();
export default fire;

export const serverTimestamp = firebase.database.ServerValue.TIMESTAMP;
