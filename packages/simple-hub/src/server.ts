import * as Sentry from '@sentry/node';

if (process.env.RUNTIME_ENV) {
  Sentry.init({
    dsn: 'https://5b818f025d1a4259a8cf086377b67025@sentry.io/2047255',
    environment: process.env.RUNTIME_ENV
  });
}
import {logger} from './logger';
import {fbListen, fbSend} from './message/firebase-relay';

const log = logger();

export async function startServer(): Promise<any> {
  const fbMessageCallback = async (message: any) => {
    log.info({message}, 'Received message from firebase');

    const outgoingMessages = ['message1'];
    try {
      await Promise.all(
        outgoingMessages.map(async outgoingMessage => {
          // log.info({message: outgoingMessages}, 'Sending message to firebase');
          await fbSend(outgoingMessage);
        })
      );
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
