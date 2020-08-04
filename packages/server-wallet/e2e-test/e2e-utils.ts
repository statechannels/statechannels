import {spawn, ChildProcessWithoutNullStreams} from 'child_process';

import kill = require('tree-kill');
import axios from 'axios';

import Knex = require('knex');
import {dbConfig} from '../src/db-config';

export type PongServer = {
  url: string;
  server: ChildProcessWithoutNullStreams;
};

/**
 * Starts the Pong Express server in a separate process. Needs to be
 * a separate process because it relies on process.env variables which
 * should not be shared between Ping and Pong -- particularly SERVER_DB_NAME
 * which indicates that Ping and Pong use separate databases, despite
 * conveniently re-using the same PostgreSQL instance.
 */
export const startPongServer = (): PongServer => {
  const server = spawn('yarn', ['ts-node', './e2e-test/pong/server'], {
    stdio: 'pipe',
    env: {
      // eslint-disable-next-line
      ...process.env,
      SERVER_DB_NAME: 'pong',
    },
  });

  server.on('error', data => console.error(data.toString()));
  server.stdout.on('data', data => console.log(data.toString()));
  server.stderr.on('data', data => console.error(data.toString()));

  return {
    server,
    url: `http://127.0.0.1:65535`,
  };
};

/**
 * Pings the server at /reset until the API responds with OK;
 * simultaneously ensures that the server is listening and cleans
 * the database of any stale data from previous test runs.
 */
export const waitForServerToStart = (pongServer: PongServer, pingInterval = 1500): Promise<void> =>
  new Promise(resolve => {
    const interval = setInterval(async () => {
      try {
        await axios.post<'OK'>(`${pongServer.url}/status`);
        clearInterval(interval);
        resolve();
      } catch {
        return;
      }
    }, pingInterval);
  });

export const knexPong: Knex = Knex({
  ...dbConfig,
  connection: {
    ...(dbConfig.connection as Knex.StaticConnectionConfig),
    database: 'pong',
  },
});

export const killServer = async ({server}: PongServer): Promise<void> => {
  kill(server.pid);
  await knexPong.destroy();
};
