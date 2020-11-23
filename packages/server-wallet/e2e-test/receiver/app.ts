import bodyParser from 'body-parser';
import express from 'express';
import { Payload } from '@statechannels/wallet-core';
import pino from 'express-pino-logger';

import { logger } from '../logger';

import ReceiverController from './controller';
export async function startApp(): Promise<express.Application> {
  const controller = new ReceiverController();
  await controller.warmup();
  const app = express();

  app.use(pino({ logger: logger as any }));

  app.post('/status', (_req, res) => res.status(200).send('OK'));

  app.get('/participant', (_req, res) =>
    res.status(200).contentType('application/json').send(controller.participantInfo)
  );

  app.post('/inbox', bodyParser.json(), async (req, res) =>
    res
      .status(200)
      .contentType('application/json')
      .send(await controller.acceptMessageAndReturnReplies(req.body.message as Payload))
  );
  return app;
}
