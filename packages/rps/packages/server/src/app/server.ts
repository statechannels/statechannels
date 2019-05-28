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
const adjudicatorWatcher = fork(`${__dirname}/../wallet/adjudicator-watcher`);
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
