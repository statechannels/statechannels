import {Server} from 'http';

module.exports = async (): Promise<unknown> => {
  console.log(`\n[e2e-teardown.ts] Terminating Pong server ...`);

  const server = (global as any).server as Server;

  const closed = new Promise(resolve =>
    server.on('close', () => {
      console.log('[e2e-teardown.ts] Server terminated');
      resolve();
    })
  );

  server.close();

  return closed;
};
