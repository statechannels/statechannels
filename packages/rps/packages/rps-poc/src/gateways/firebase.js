import firebase from 'firebase'

const config = {
  apiKey: "AIzaSyDulzMWkORgVPFwtxqQaTwOeNhOisGPtDs",
  authDomain: "rock-paper-scissors123.firebaseapp.com",
  databaseURL: "https://rock-paper-scissors123.firebaseio.com",
  projectId: "rock-paper-scissors123",
  storageBucket: "",
  messagingSenderId: "913007764573"
};

const fire = firebase.initializeApp(config);
export default fire;
