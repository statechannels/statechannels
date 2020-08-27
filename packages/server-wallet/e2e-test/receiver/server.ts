import {configureEnvVariables} from '@statechannels/devtools';
configureEnvVariables();

import app from './app';

const server = app.listen(65535, '127.0.0.1');

app.on('listening', () => {
  console.info('[receiver] Listening on 127.0.0.1:65535');
});

process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.close();
  process.exit(0);
});
