import {RelayableAction} from '../communication';
import '../wallet/db/connection';
import {assetHolderListen} from '../wallet/services/asset-holder-watcher';
import {handleWalletMessage} from './handlers/handle-wallet-message';
import {logger} from '../logger';
import {onDepositEvent} from '../wallet/services/depositManager';
import {fbListen, fbSend} from '../message/firebase-relay';

const log = logger();

export async function startServer(): Promise<any> {
  console.log(process.env.FIREBASE_PROJECT);
  console.log('=====================');
  const fbMessageCallback = async (message: RelayableAction) => {
    log.info({message}, 'Received message from firebase');

    const outgoingMessages = await handleWalletMessage(message);
    try {
      await Promise.all(
        outgoingMessages.map(async outgoingMessage => {
          // log.info({message: outgoingMessages}, 'Sending message to firebase');
          await fbSend(outgoingMessage);
        })
      );
    } catch (reason) {
      log.error(reason);
    }
  };

  fbListen(fbMessageCallback);
  return [await assetHolderListen(onDepositEvent)];
}

if (require.main === module) {
  require('../../env'); // Note: importing this module has the side effect of modifying env vars
  console.log(process.env.FIREBASE_PROJECT);
  console.log('=====================');
  startServer();
}
