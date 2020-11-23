import express from 'express';
import pino from 'express-pino-logger';

import { logger } from '../logger';
import { alice } from '../../src/wallet/__test__/fixtures/signing-wallets';
import { RECEIVER_PORT } from '../e2e-utils';

import PayerClient from './client';
export async function startApp(): Promise<express.Application> {
  const client = new PayerClient(alice().privateKey, `http://127.0.0.1:${RECEIVER_PORT}`);
  await client.warmup();
  const app = express();

  app.use(pino({ logger: logger as any }));

  app.post('/status', (_req, res) => res.status(200).send('OK'));

  app.get('/makePayment', async (req, res) => {
    try {
      const result = await client.makePayment(req.query.channelId?.toString() || '');
      res.status(200).send(result);
    } catch (error) {
      res.status(500).send(error);
    }
  });
  return app;
}
