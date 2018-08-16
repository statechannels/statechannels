import firebase from 'firebase'
import ReduxSagaFirebase from 'redux-saga-firebase'

const config = {
  apiKey: "AIzaSyDulzMWkORgVPFwtxqQaTwOeNhOisGPtDs",
  authDomain: "rock-paper-scissors123.firebaseapp.com",
  databaseURL: "https://rock-paper-scissors123.firebaseio.com",
  projectId: "rock-paper-scissors123",
  storageBucket: "",
  messagingSenderId: "913007764573",
};

const fire = firebase.initializeApp(config);
export const reduxSagaFirebase = new ReduxSagaFirebase(fire);
export const authProvider = new firebase.auth.GoogleAuthProvider();
export default fire;
