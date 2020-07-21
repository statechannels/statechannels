import {Config} from 'knex';
import {knexSnakeCaseMappers} from 'objection';
import {configureEnvVariables} from '@statechannels/devtools';

configureEnvVariables();

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
