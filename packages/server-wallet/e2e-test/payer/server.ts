import {configureEnvVariables} from '@statechannels/devtools';
export const PAYER_PORT = 65534;
process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.close();
  process.exit(0);
});

configureEnvVariables();

import app from './app';

const server = app.listen(PAYER_PORT, '127.0.0.1');

app.on('listening', () => {
  console.info(`[receiver] Listening on 127.0.0.1:${PAYER_PORT}`);
});
