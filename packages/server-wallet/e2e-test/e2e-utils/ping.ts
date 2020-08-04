#!/usr/bin/env node

import yargs from 'yargs';
import {Model} from 'objection';
import Knex from 'knex';
import _ from 'lodash';

import {dbCofig} from '../../src/db-config';
import PingClient from '../ping/client';
import {alice} from '../../src/wallet/__test__/fixtures/signing-wallets';

const {database, channels, numPings} = yargs
  .command('ping', 'Ping many channels concurrently')
  .example('ping --database ping --channels 0xf00 0x123 0xabc', 'Pings three channels')
  .options({
    database: {type: 'string', demandOption: true},
    channels: {type: 'array', demandOption: true},
    numPings: {type: 'number'},
  })
  .default({numPings: 1})
  .coerce('channels', (channels: number[]): string[] =>
    channels.map(channel => channel.toString(16))
  ).argv;

const knex = Knex(_.merge(dbCofig, {connection: {database}}));
Model.knex(knex);

console.log(`numPings: ${numPings}`);

(async (): Promise<void> => {
  const pingClient = new PingClient(alice().privateKey, `http://127.0.0.1:65535`);
  await Promise.all(
    (channels || []).map(async channelId => {
      for (const _i of _.range(numPings)) {
        await pingClient.ping(channelId);
      }
    })
  );

  process.exit();
})();
