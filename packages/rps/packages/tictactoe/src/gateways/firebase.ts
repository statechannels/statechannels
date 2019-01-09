import firebase from 'firebase';
import ReduxSagaFirebase from 'redux-saga-firebase';

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT}.firebaseapp.com`,
  databaseURL: `https://${process.env.FIREBASE_PROJECT}.firebaseio.com`,
  projectId: process.env.FIREBASE_PROJECT,
  storageBucket: "tic-tac-toe-dev-3a21f.appspot.com",
  messagingSenderId: "706533094816",
};


const fire = firebase.initializeApp(config);
export const reduxSagaFirebase = new ReduxSagaFirebase(fire);
export const authProvider = new firebase.auth.GoogleAuthProvider();
export default fire;

export const  serverTimestamp = firebase.database.ServerValue.TIMESTAMP;