import {Config} from 'knex';
import {knexSnakeCaseMappers} from 'objection';

import walletConfig from '../config';

export const dbConfig: Config = {
  client: 'postgres',

  connection: walletConfig.postgresDatabaseUrl || {
    host: walletConfig.postgresHost,
    port: Number(walletConfig.postgresPort),
    database: walletConfig.postgresDBName,
    user: walletConfig.postgresDBUser,
  },

  ...knexSnakeCaseMappers(),
};
