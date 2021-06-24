import * as path from 'path';
import {promisify} from 'util';
import {exec as rawExec} from 'child_process';

const exec = promisify(rawExec);
import Knex from 'knex';
import _ from 'lodash';

import {SigningWallet} from '../models/signing-wallet';
import {Channel} from '../models/channel';
import {Nonce} from '../models/nonce';
import {ObjectiveModel, ObjectiveChannelModel} from '../models/objective';
import {Funding} from '../models/funding';
import {AppBytecode} from '../models/app-bytecode';
import {LedgerRequest} from '../models/ledger-request';
import {ChainServiceRequest} from '../models/chain-service-request';
import {AdjudicatorStatusModel} from '../models/adjudicator-status';
import {
  defaultConfig,
  extractDBConfigFromWalletConfig,
  getDatabaseConnectionConfig,
  IncomingWalletConfig,
} from '../config';

type DBConnectionConfig = {database: string; user: string};

/**
 * A collection of static utility methods for db admin
 */
export class DBAdmin {
  /**
   * Creates a database based on the database specified in the wallet configuration
   * @param config The wallet configuration object with a database specified
   */
  static async createDatabase(config: IncomingWalletConfig): Promise<void> {
    await createDbIfDoesntExist(getDbConnectionConfigFromConfig(config));
  }

  /**
   * Creates the database specified by the knex instance connection info
   * @param knex The knex instance which should have a db name specified
   */
  static async createDatabaseFromKnex(knex: Knex): Promise<void> {
    await createDbIfDoesntExist(getDbConnectionConfigFromKnex(knex));
  }

  /**
   * Drops the database based on the database specified in the wallet configuration
   * @param config The wallet configuration object containing the database configuration to use
   */
  static async dropDatabase(config: IncomingWalletConfig): Promise<void> {
    await dropDbIfExists(getDbConnectionConfigFromConfig(config));
  }

  /**
   * Drops the database specified by the knex instance connection info
   * @param knex The knex instance which should have a db name specified
   */
  static async dropDatabaseFromKnex(knex: Knex): Promise<void> {
    await dropDbIfExists(getDbConnectionConfigFromKnex(knex));
  }

  /**
   * Performs wallet database migrations against the database specified in the config
   * @param config The wallet configuration object containing the database configuration to use
   */
  static async migrateDatabase(config: IncomingWalletConfig): Promise<void> {
    const knex = getKnexFromConfig(config);
    await DBAdmin.migrateDatabaseFromKnex(knex);
    await knex.destroy();
  }

  /**
   * Performs wallet database migrations for the database specified by the knex instance connection info
   * @param knex The knex instance that will be used for the migrations
   */
  static async migrateDatabaseFromKnex(knex: Knex): Promise<void> {
    const extensions = [path.extname(__filename)];
    return knex.migrate.latest({
      directory: path.join(__dirname, '../db/migrations'),
      loadExtensions: extensions,
    });
  }

  /**
   * Truncates data from all the specified tables
   * @param config The wallet configuration object containing the database configuration to use
   * @param tables A list of table names to truncate. Defaults to ALL tables
   */
  static async truncateDatabase(
    config: IncomingWalletConfig,
    tables = defaultTables
  ): Promise<void> {
    const knex = getKnexFromConfig(config);
    await DBAdmin.truncateDataBaseFromKnex(knex, tables);
    await knex.destroy();
  }

  /**
   * Truncates data from all the specified tables
   * @param knex A knex instance connected to a wallet database
   * @param tables A list of table names to truncate, which defaults to ALL tables
   */
  static async truncateDataBaseFromKnex(knex: Knex, tables = defaultTables): Promise<void> {
    // eslint-disable-next-line no-process-env
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
      throw 'Cannot truncate unless in test or development environments';
    }
    await Promise.all(
      tables.map(async table => {
        try {
          await knex.raw(`TRUNCATE TABLE ${table} CASCADE;`);
        } catch (e) {
          console.log(`Error truncating ${table}: ${e}`);
        }
      })
    );
  }
}

function getKnexFromConfig(config: IncomingWalletConfig): Knex {
  const populatedConfig = _.assign({}, defaultConfig, config);
  return Knex(extractDBConfigFromWalletConfig(populatedConfig));
}
function getDbConnectionConfigFromKnex(knex: Knex): DBConnectionConfig {
  const {database, user} = knex.client.config.connection;
  return {database, user};
}

function getDbConnectionConfigFromConfig(config: IncomingWalletConfig): DBConnectionConfig {
  const populatedConfig = _.assign({}, defaultConfig, config);
  const {database, user} = getDatabaseConnectionConfig(populatedConfig);
  return {database, user};
}

async function createDbIfDoesntExist(config: DBConnectionConfig): Promise<void> {
  try {
    await exec(`createdb ${config.database} -U ${config.user} $PSQL_ARGS`);
  } catch (e) {
    // ignore error if db already exists
    if (!(e.stderr && e.stderr.includes(' already exists'))) {
      throw e;
    }
  }
}

async function dropDbIfExists(config: DBConnectionConfig): Promise<void> {
  await exec(`dropdb ${config.database} -U ${config.user} --if-exists $PSQL_ARGS`);
}

const defaultTables = [
  SigningWallet,
  Channel,
  Nonce,
  ObjectiveModel,
  ObjectiveChannelModel,
  Funding,
  AppBytecode,
  LedgerRequest,
  Funding,
  AdjudicatorStatusModel,
  ChainServiceRequest,
].map(model => model.tableName);
