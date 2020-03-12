import * as firebase from 'firebase';
import {configureEnvVariables} from '@statechannels/devtools';
import {cFirebasePrefix} from '../src/constants';
import {Message} from '@statechannels/wire-format';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const messages: Array<Message> = require('./message-sequence.json');

configureEnvVariables(true);

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  databaseURL: process.env.FIREBASE_URL
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
  return firebaseAppInsance.database().ref(`${cFirebasePrefix}/messages`);
}

async function sendMessage(message: Message) {
  return getMessagesRef()
    .child(message.recipient)
    .push(message);
}

async function readAndFeedMessages() {
  await Promise.all(messages.map(sendMessage));
  getFirebaseApp().delete();
}

if (require.main === module) {
  readAndFeedMessages();
}
