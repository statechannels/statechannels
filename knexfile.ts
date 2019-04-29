// Update with your config settings.
const path = require('path');
const env = require('dotenv').config();

let dotenvExpand = require('dotenv-expand');
dotenvExpand(env);

let sourceDirectory = 'src';
if (
  process.env.NODE_ENV === 'staging' ||
  process.env.NODE_ENV === 'production'
) {
  sourceDirectory = 'lib';
}
const BASE_PATH = path.join(__dirname, sourceDirectory, 'wallet', 'db');
const CONN_STRING = `${process.env.SERVER_WALLET_DB_CONN_STRING}/${
  process.env.SERVER_WALLET_DB_NAME
}`;

module.exports = {
  test: {
    client: 'pg',
    connection: CONN_STRING,
    migrations: {
      directory: path.join(BASE_PATH, 'migrations'),
      extensions: ['ts'],
    },
    seeds: {
      directory: path.join(BASE_PATH, 'seeds'),
    },
    pool: { min: 0, max: 1 }, // Limiting connection pool to one removes concurrency issues during testing.
    debug: process.env.DEBUG_KNEX === 'TRUE',
  },

  development: {
    client: 'pg',
    connection: CONN_STRING,
    migrations: {
      directory: path.join(BASE_PATH, 'migrations'),
      extensions: ['ts'],
    },
    seeds: {
      directory: path.join(BASE_PATH, 'seeds'),
    },
    debug: process.env.DEBUG_KNEX === 'TRUE',
  },

  staging: {
    client: 'pg',
    connection: CONN_STRING,
    migrations: {
      directory: path.join(BASE_PATH, 'migrations'),
      extensions: ['js'],
    },
    seeds: {
      directory: path.join(BASE_PATH, 'seeds'),
    },
    debug: process.env.DEBUG_KNEX === 'TRUE',
  },

  production: {
    client: 'pg',
    connection: CONN_STRING,
    migrations: {
      directory: path.join(BASE_PATH, 'migrations'),
      extensions: ['js'],
    },
    seeds: {
      directory: path.join(BASE_PATH, 'seeds'),
    },
    debug: process.env.DEBUG_KNEX === 'TRUE',
  },
};
