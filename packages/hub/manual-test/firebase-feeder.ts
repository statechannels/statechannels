import * as firebase from 'firebase';
import {configureEnvVariables} from '@statechannels/devtools';
import {RelayActionWithMessage} from '../src/communication';
import {FIREBASE_PREFIX} from '../src/constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const messages: Array<RelayActionWithMessage> = require('./message-sequence.json');

const HUB_ADDRESS = '0x87e0ED760fb316eeb94Bd9cF23D1d2BE87aCe3d8';

configureEnvVariables(true);

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT}.firebaseapp.com`,
  databaseURL: `https://${process.env.FIREBASE_PROJECT}.firebaseio.com`,
  projectId: process.env.FIREBASE_PROJECT,
  storageBucket: '',
  messagingSenderId: '913007764573'
};

let firebaseApp: firebase.app.App;
function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }
  firebaseApp = firebase.initializeApp(config);
  return firebaseApp;
}

function getMessagesRef() {
  const firebaseAppInsance = getFirebaseApp();
  return firebaseAppInsance.database().ref(`${FIREBASE_PREFIX}/messages`);
}

async function sendMessage(message: RelayActionWithMessage) {
  const sanitizedPayload = JSON.parse(JSON.stringify(message));
  await getMessagesRef()
    .child(message.recipient)
    .push(sanitizedPayload);
}

async function readAndFeedMessages() {
  await Promise.all(messages.map(message => sendMessage({...message, recipient: HUB_ADDRESS})));
  getFirebaseApp().delete();
}

if (require.main === module) {
  readAndFeedMessages();
}
