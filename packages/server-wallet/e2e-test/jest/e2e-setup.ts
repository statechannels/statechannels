import {Server} from 'http';

import app from '../pong/app';

module.exports = async (): Promise<void> => {
  let server: Server;

  server = await new Promise(function(resolve) {
    server = app.listen(0, '127.0.0.1', function() {
      const {address, port} = server.address() as {address: string; port: number};
      console.log(`\nRunning HTTP Pong server on ${address}:${port}...`);
      resolve(server);
    });
  });

  const address = server.address() as {address: string; port: number};

  (global as any).server = server;

  // eslint-disable-next-line
  process.env.SERVER_ADDRESS = `http://${address.address}:${address.port}`;
};
