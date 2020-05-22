import '../env'; // Note: importing this module has the side effect of modifying env vars
import _ from 'lodash';

import * as Sentry from '@sentry/node';

if (process.env.HEROKU_APP_NAME) {
  Sentry.init({
    dsn: 'https://18f53d1daf144411b98547e2ac93a914@sentry.io/4410960',
    environment: _.replace(process.env.HEROKU_APP_NAME, 'simple-hub-', '')
  });
}
import {fbObservable} from './message/firebase-relay';
import {log} from './logger';
import {cHubParticipantId, cFirebasePrefix} from './constants';
import {onIncomingMessage} from './message/on-message';

export async function startServer() {
  onIncomingMessage(fbObservable());
  log.info(`Listening on database ${process.env.FIREBASE_URL}`);
  log.info(`Firebase prefix set to ${cFirebasePrefix}`);
  log.info(`Hub listening for messages sent to ${cHubParticipantId}`);
}

if (require.main === module) {
  startServer();
}
