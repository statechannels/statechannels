import {unreachable} from '@statechannels/wallet';
import {RelayableAction} from '@statechannels/wallet/lib/src/communication';
import {fork} from 'child_process';
import {Model} from 'objection';
import {
  AssetHolderEventHandler,
  assetHolderListen,
  AssetHolderWatcherEvent,
  AssetHolderWatcherEventType
} from '../wallet/asset-holder-watcher';
import knex from '../wallet/db/connection';
import {onDepositEvent} from '../wallet/services/depositManager';
import {handleWalletMessage} from './handlers/handle-wallet-message';

Model.knex(knex);

// A forked process inherits execArgv from the parent
// --inspect-brk is present when the process is launched via vs code debug
// The debug port cannot be used for both the parent process and child processes.
const forkExecArgv = process.execArgv.filter(arg => !arg.includes('--inspect-brk'));

const firebaseRelay = fork(`${__dirname}/../message/firebase-relay`, [], {
  execArgv: forkExecArgv
});
firebaseRelay.on('message', (message: RelayableAction) => {
  console.log(
    `Parent process received message from firebase": ${JSON.stringify(message, null, 1)}`
  );

  handleWalletMessage(message)
    .then(outgoingMessages => {
      for (const outgoingMessage of outgoingMessages) {
        console.log(
          `Parent process sending message to firebase: ${JSON.stringify(outgoingMessage, null, 1)}`
        );
        firebaseRelay.send(outgoingMessage);
      }
    })
    .catch(reason => console.error(reason));
});
console.log('Firebase relay sub-process started');

const assetHolderEventHandler: AssetHolderEventHandler = (message: AssetHolderWatcherEvent) => {
  console.log(`Received asset holder watcher message: ${JSON.stringify(message, null, 1)}`);
  switch (message.eventType) {
    case AssetHolderWatcherEventType.Deposited:
      onDepositEvent(message.channelId, message.amountDeposited, message.destinationHoldings);
      break;
    default:
      unreachable(message.eventType);
  }
};
assetHolderListen(assetHolderEventHandler);
