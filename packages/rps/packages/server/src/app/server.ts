import { fork } from 'child_process';
import { unreachable } from 'magmo-wallet';
import { Model } from 'objection';
import {
  AdjudicatorWatcherEvent,
  AdjudicatorWatcherEventType,
} from '../wallet/adjudicator-watcher';
import knex from '../wallet/db/connection';
import { onDepositEvent } from '../wallet/services/depositManager';
import app from './app';
import { config } from './config';

Model.knex(knex);

const server = app.listen(config.port).on('error', err => {
  console.error(err);
});

console.log('Application started. Listening on port:' + config.port);

// A forked process inherits execArgv from the parent
// --inspect-brk is present when the process is launched via vs code debug
// The debug port cannot be used for both the parent process and the adjudicator-watcher child process.
const forkExecArgv = process.execArgv.filter(arg => !arg.includes('--inspect-brk'));
const adjudicatorWatcher = fork(`${__dirname}/../wallet/adjudicator-watcher`, [], {
  execArgv: forkExecArgv,
});
adjudicatorWatcher.on('message', (message: AdjudicatorWatcherEvent) => {
  console.log(`Parent received message: ${message}`);
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

export default server;
