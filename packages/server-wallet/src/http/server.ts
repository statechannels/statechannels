import express from 'express';
import {configureEnvVariables} from '@statechannels/devtools';

import {Channel} from '../models/channel';
import '../db/connection'; // This is how the DB is "connected"

configureEnvVariables();

const app = express();

const router = express.Router();

router.get('/inbox', async (req, res) => {
  return res.json({
    message: await Channel.query(),
  });
});

app.use('/api', router);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`[App]: Listening on port ${port}`);
});
