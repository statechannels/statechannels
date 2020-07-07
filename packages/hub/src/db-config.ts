import {Config} from 'knex';

import '../env';

export const dbCofig: Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: process.env.HUB_DB_HOST,
    port: Number(process.env.HUB_DB_PORT),
    database: process.env.HUB_DB_NAME,
    user: process.env.HUB_DB_USER
  }
};
