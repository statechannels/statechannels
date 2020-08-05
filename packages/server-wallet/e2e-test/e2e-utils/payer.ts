#!/usr/bin/env node

import yargs from 'yargs';
import {Model} from 'objection';
import Knex from 'knex';
import _ from 'lodash';

import {dbConfig} from '../../src/db/config';
import PayerClient from '../payer/client';
import {alice} from '../../src/wallet/__test__/fixtures/signing-wallets';

const {database, channels, numPayments} = yargs
  .command('payer', 'Makes (fake) payments on many channels concurrently')
  .example(
    'payer --database payer --channels 0xf00 0x123 0xabc',
    'Makes payments with three channels'
  )
  .options({
    database: {type: 'string', demandOption: true},
    channels: {type: 'array', demandOption: true},
    numPayments: {type: 'number'},
  })
  .default({numPayments: 1})
  .coerce('channels', (channels: number[]): string[] =>
    channels.map(channel => channel.toString(16))
  ).argv;

const knex = Knex(_.merge(dbConfig, {connection: {database}}));
Model.knex(knex);

console.log(`numPayments: ${numPayments}`);

(async (): Promise<void> => {
  const payerClient = new PayerClient(alice().privateKey, `http://127.0.0.1:65535`);
  await Promise.all(
    (channels || []).map(async channelId =>
      _.range(numPayments).reduce(
        async p => p.then(() => payerClient.makePayment(channelId)),
        Promise.resolve()
      )
    )
  );

  process.exit();
})();
