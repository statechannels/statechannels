import express from 'express';
import {configureEnvVariables} from '@statechannels/devtools';

import '../db/connection'; // This is how the DB is "connected"
import {Wallet} from '../wallet';

configureEnvVariables();

const app = express();

const myWallet = new Wallet();

app.post('/inbox', async (req, res) => {
  return res.json({
    message: myWallet.pushMessage(req.body),
  });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`[App]: Listening on port ${port}`);
});
