import { configureEnvVariables } from '@statechannels/devtools';

import { RECEIVER_PORT } from '../e2e-utils';

import { startApp } from './app';

(async function (): Promise<void> {
  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.close();
    process.exit(0);
  });

  configureEnvVariables();
  const app = await startApp();
  const server = app.listen(RECEIVER_PORT, '127.0.0.1');

  app.on('listening', () => {
    console.info(`[receiver] Listening on 127.0.0.1:${RECEIVER_PORT}`);
  });
})();
