import {configureEnvVariables} from '@statechannels/devtools';
import {Server} from 'jayson';
import bodyParser from 'body-parser';
import express from 'express';

import '../../src/db/connection'; // This is how the DB is "connected"
import PongController from './controller';

configureEnvVariables();

const controller = new PongController();

const app = express();

const jsonRpcServer = new Server({
  status: (_args: any, done: any): Promise<void> => done(null, 'Up!'),
  receiveMessage: async function(args: any, done: any): Promise<void> {
    let err = null;
    let ret = undefined;
    try {
      ret = await controller.handleMessage(args);
    } catch (e) {
      err = e;
    } finally {
      done(err, ret);
    }
  },
});

app.use(bodyParser.json());
app.use(jsonRpcServer.middleware());

export default app;
