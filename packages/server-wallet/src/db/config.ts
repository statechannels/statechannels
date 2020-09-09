import {Config} from 'knex';
import {knexSnakeCaseMappers} from 'objection';

import walletConfig from '../config';

export const dbConfig: Config = {...walletConfig.dbConfig, ...knexSnakeCaseMappers()};
