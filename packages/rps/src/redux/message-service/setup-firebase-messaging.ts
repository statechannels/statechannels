import {default as firebase} from '../../gateways/firebase';
import {RPSChannelClient} from '../../utils/rps-channel-client';
import {FIREBASE_PREFIX} from '../../constants';
import {Message} from '@statechannels/client-api-schema';

function sanitizeMessageForFirebase(message) {
  return JSON.parse(JSON.stringify(message));
}

export function setupFirebase(client: RPSChannelClient, address: string) {
  const myFirebaseRef = firebase.database().ref(`/${FIREBASE_PREFIX}/messages/${address}`);

  myFirebaseRef.onDisconnect().remove();

  client.onMessageQueued((message: Message) => {
    const counterpartyFirebaseRef = firebase
      .database()
      .ref(`/${FIREBASE_PREFIX}/messages/${message.recipient}`);
    counterpartyFirebaseRef.push(sanitizeMessageForFirebase(message));
  });

  myFirebaseRef.on('child_added', async snapshot => {
    const key = snapshot.key;
    const message = snapshot.val();
    myFirebaseRef.child(key).remove();
    console.log('GOT FROM FIREBASE: ' + JSON.stringify(message));
    await client.pushMessage(message);
  });
}
