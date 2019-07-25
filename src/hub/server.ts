import { fork } from 'child_process';
import { unreachable } from 'magmo-wallet';
import { RelayableAction } from 'magmo-wallet/lib/src/communication';
import { Model } from 'objection';
import {
  AdjudicatorWatcherEvent,
  AdjudicatorWatcherEventType,
} from '../wallet/adjudicator-watcher';
import knex from '../wallet/db/connection';
import { onDepositEvent } from '../wallet/services/depositManager';
import { handleWalletMessage } from './handlers/handle-wallet-message';

Model.knex(knex);

// A forked process inherits execArgv from the parent
// --inspect-brk is present when the process is launched via vs code debug
// The debug port cannot be used for both the parent process and child processes.
const forkExecArgv = process.execArgv.filter(arg => !arg.includes('--inspect-brk'));

const firebaseRelay = fork(`${__dirname}/../message/firebase-relay`, [], {
  execArgv: forkExecArgv,
});
firebaseRelay.on('message', (message: RelayableAction) => {
  console.log(`Parent process received message from firebase": ${JSON.stringify(message)}`);
  const outgoingMessage = handleWalletMessage(message);
  if (outgoingMessage) {
    console.log(`Parent process sending message to firebase${JSON.stringify(outgoingMessage)}`);
    firebaseRelay.send(outgoingMessage);
  }
});
console.log('Firebase relay sub-process started');

const adjudicatorWatcher = fork(`${__dirname}/../wallet/adjudicator-watcher`, [], {
  execArgv: forkExecArgv,
});

adjudicatorWatcher.on('message', (message: AdjudicatorWatcherEvent) => {
  console.log(`Parent process received adjudicator watcher message: ${JSON.stringify(message)}`);
  switch (message.eventType) {
    case AdjudicatorWatcherEventType.Deposited:
      onDepositEvent(message.channelId, message.amountDeposited, message.destinationHoldings);
      break;
    case AdjudicatorWatcherEventType.ChallengeCreated:
      return;
    default:
      unreachable(message.eventType);
  }
});
console.log('Adjudicator watcher sub-process started');
