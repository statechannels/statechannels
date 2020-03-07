import * as Sentry from '@sentry/node';

if (process.env.RUNTIME_ENV) {
  Sentry.init({
    dsn: 'https://5b818f025d1a4259a8cf086377b67025@sentry.io/2047255',
    environment: process.env.RUNTIME_ENV
  });
}
import {logger} from './logger';
import {fbListen} from './message/firebase-relay';
import {Message} from '@statechannels/wire-format';
import {respondToMessage} from './wallet';
import {assetHolderListen} from './blockchain/asset-holder-watcher';
import {onDepositEvent} from './wallet/deposit';

const log = logger();

function responseForMessage(incomingMessage: Message): Message[] {
  log.info({incomingMessage}, 'Received message from firebase');
  return respondToMessage(incomingMessage);
}

export async function startServer() {
  await assetHolderListen(onDepositEvent);
  fbListen(responseForMessage);
}

if (require.main === module) {
  startServer();
}
