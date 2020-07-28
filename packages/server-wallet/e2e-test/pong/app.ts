import bodyParser from 'body-parser';
import express from 'express';
import {Message} from '@statechannels/wire-format';

import knex from '../../src/db/connection';
import {seed as seedSigningWallets} from '../../src/db/seeds/1_signing_wallet_seeds';

import PongController from './controller';

const controller = new PongController();

const app = express();

app.post('/reset', async (_req, res) => {
  await seedSigningWallets(knex);
  res.status(200).send('OK');
});

app.post('/inbox', bodyParser.json(), async (req, res) =>
  res
    .status(200)
    .contentType('application/json')
    .send(await controller.acceptMessageAndReturnReplies(req.body.message as Message))
);

export default app;
