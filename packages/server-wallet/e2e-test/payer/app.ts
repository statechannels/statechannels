import express from 'express';
import pino from 'express-pino-logger';

import {logger} from '../logger';
import {alice} from '../../src/wallet/__test__/fixtures/signing-wallets';

import PayerClient from './client';
import {PAYER_PORT} from './server';

const client = new PayerClient(alice().privateKey, `http://127.0.0.1:${PAYER_PORT}`);

const app = express();

app.use(pino({logger: logger as any}));

app.post('/status', (_req, res) => res.status(200).send('OK'));

app.get('/makePayment', async (req, res) => {
  const result = await client.makePayment(req.query.channelId?.toString() || '');
  res.status(200).send(result);
});

export default app;
