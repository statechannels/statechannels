import {Config} from 'knex';

import './env';
import {knexSnakeCaseMappers} from 'objection';

export const dbCofig: Config = {
  client: 'postgres',
  connection: process.env.DATABASE_URL || {
    host: process.env.SERVER_DB_HOST,
    port: Number(process.env.SERVER_DB_PORT),
    database: process.env.SERVER_DB_NAME,
    user: process.env.SERVER_DB_USER,
  },
  ...knexSnakeCaseMappers(),
};
