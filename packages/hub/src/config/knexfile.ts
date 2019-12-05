import * as path from 'path';
import {Config} from 'knex';

let sourceDirectory = 'src';
if (process.env.NODE_ENV !== 'test') {
  sourceDirectory = 'lib';
}
const BASE_PATH = path.join(__dirname, '..', '..', sourceDirectory, 'wallet', 'db');

const baseProperties: Config = {
  client: 'pg',
  connection: {
    host: process.env.HUB_DB_HOST,
    port: parseInt(process.env.HUB_DB_PORT, 10),
    database: process.env.HUB_DB_NAME,
    user: process.env.HUB_DB_USER
  },
  migrations: {
    directory: path.join(BASE_PATH, 'migrations')
  },
  seeds: {
    directory: path.join(BASE_PATH, 'seeds')
  }
};

export const test = {
  ...baseProperties,
  pool: {min: 0, max: 1}, // Limiting connection pool to one removes concurrency issues during testing.
  debug: process.env.DEBUG_KNEX === 'TRUE'
};

export const development = {
  ...baseProperties,
  debug: process.env.DEBUG_KNEX === 'TRUE'
};
