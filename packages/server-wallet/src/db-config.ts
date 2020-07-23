import {Config} from 'knex';
import {knexSnakeCaseMappers} from 'objection';

import config from './config';

export const dbCofig: Config = {
  client: 'postgres',
  connection: config.postgresDatabaseUrl || {
    host: config.postgresHost,
    port: Number(config.postgresPort),
    database: config.postgresDBName,
    user: config.postgresDBUser,
  },
  ...knexSnakeCaseMappers(),
};
