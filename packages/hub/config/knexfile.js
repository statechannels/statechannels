// Update with your config settings.
const path = require('path');
require('./env');

let sourceDirectory = 'src';
if (process.env.NODE_ENV === 'staging' || process.env.NODE_ENV === 'production') {
  sourceDirectory = 'lib';
}
const BASE_PATH = path.join(__dirname, '..', sourceDirectory, 'wallet', 'db');

const baseProperties = {
  client: 'pg',
  connection: {
    host: process.env.HUB_DB_HOST,
    port: process.env.HUB_DB_PORT,
    database: process.env.HUB_DB_NAME
  },
  migrations: {
    directory: path.join(BASE_PATH, 'migrations'),
    extensions: ['ts']
  },
  seeds: {
    directory: path.join(BASE_PATH, 'seeds')
  }
};

module.exports = {
  test: {
    ...baseProperties,
    pool: {min: 0, max: 1}, // Limiting connection pool to one removes concurrency issues during testing.
    debug: process.env.DEBUG_KNEX === 'TRUE'
  },

  development: {
    ...baseProperties,
    debug: process.env.DEBUG_KNEX === 'TRUE'
  }
};
