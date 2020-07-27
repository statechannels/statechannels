import {configureEnvVariables} from '@statechannels/devtools';
import bodyParser from 'body-parser';
import express from 'express';
import {Message} from '@statechannels/wire-format';

import '../../src/db/connection'; // This is how the DB is "connected"

import PongController from './controller';

configureEnvVariables();

const controller = new PongController();

const app = express();

app.post('/inbox', bodyParser.json(), async (req, res) =>
  res
    .status(200)
    .contentType('application/json')
    .send(await controller.acceptMessageAndReturnReplies(req.body.message as Message))
);

export default app;
