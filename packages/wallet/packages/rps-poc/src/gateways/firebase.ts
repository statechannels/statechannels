import firebase from 'firebase'
import ReduxSagaFirebase from 'redux-saga-firebase'

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT}.firebaseapp.com`,
  databaseURL: `https://${process.env.FIREBASE_PROJECT}.firebaseio.com`,
  projectId: process.env.FIREBASE_PROJECT,
  storageBucket: "",
  messagingSenderId: "913007764573",
};

const fire = firebase.initializeApp(config);
export const reduxSagaFirebase = new ReduxSagaFirebase(fire);
export const authProvider = new firebase.auth.GoogleAuthProvider();
export default fire;
