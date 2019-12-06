import {Config} from 'knex';

export const dbCofig: Config = {
  client: 'pg',
  connection: {
    host: process.env.HUB_DB_HOST,
    port: Number(process.env.HUB_DB_PORT),
    database: process.env.HUB_DB_NAME,
    user: process.env.HUB_DB_USER
  }
};
