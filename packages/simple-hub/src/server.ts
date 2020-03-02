import * as Sentry from '@sentry/node';

if (process.env.RUNTIME_ENV) {
  Sentry.init({
    dsn: 'https://5b818f025d1a4259a8cf086377b67025@sentry.io/2047255',
    environment: process.env.RUNTIME_ENV
  });
}
import {logger} from './logger';
import {fbListen, fbSend} from './message/firebase-relay';
import {Message} from '@statechannels/wire-format';
import {respondToMessage} from './wallet';

const log = logger();

export async function startServer(): Promise<any> {
  const fbMessageCallback = async (incomingMessage: Message) => {
    log.info({incomingMessage}, 'Received message from firebase');

    const outgoingMessage = respondToMessage(incomingMessage);
    try {
      // log.info({message: outgoingMessages}, 'Sending message to firebase');
      await fbSend(outgoingMessage);
    } catch (reason) {
      log.error(reason);
      throw reason;
    }
  };

  fbListen(fbMessageCallback);
}

if (require.main === module) {
  startServer();
}
