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
import {LedgerProposal} from '../models/ledger-proposal';
import {ChainServiceRequest} from '../models/chain-service-request';
import {AdjudicatorStatusModel} from '../models/adjudicator-status';
import {
  defaultConfig,
  extractDBConfigFromServerWalletConfig,
  getDatabaseConnectionConfig,
  IncomingServerWalletConfig,
} from '../config';

/**
 * A collection of static utility methods for db admin
 */
export class DBAdmin {
  /**
   * Creates a database based on the database specified in the wallet configuration
   * @param config The wallet configuration object with a database specified
   */
  static async createDatabase(config: IncomingServerWalletConfig): Promise<void> {
    try {
      await exec(`createdb ${getDbNameFromConfig(config)} $PSQL_ARGS`);
    } catch (e) {
      if (!(e.stderr && e.stderr.includes(' already exists'))) {
        throw e;
      } // ignore error if db already exists
    }
  }

  /**
   * Creates the database specified by the knex instance connection info
   * @param knex The knex instance which should have a db name specified
   */
  static async createDatabaseFromKnex(knex: Knex): Promise<void> {
    await exec(`createdb ${getDbNameFromKnex(knex)} $PSQL_ARGS`);
  }

  /**
   * Drops the database based on the database specified in the wallet configuration
   * @param config The wallet configuration object containing the database configuration to use
   */
  static async dropDatabase(config: IncomingServerWalletConfig): Promise<void> {
    await exec(`dropdb ${getDbNameFromConfig(config)} --if-exists $PSQL_ARGS`);
  }

  /**
   * Drops the database specified by the knex instance connection info
   * @param knex The knex instance which should have a db name specified
   */
  static async dropDatabaseFromKnex(knex: Knex): Promise<void> {
    await exec(`dropdb ${getDbNameFromKnex(knex)} --if-exists $PSQL_ARGS`);
  }

  /**
   * Performs wallet database migrations against the database specified in the config
   * @param config The wallet configuration object containing the database configuration to use
   */
  static async migrateDatabase(config: IncomingServerWalletConfig): Promise<void> {
    const knex = getKnexFromConfig(config);
    await DBAdmin.migrateDatabaseFromKnex(knex);
    knex.destroy();
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
    config: IncomingServerWalletConfig,
    tables = defaultTables
  ): Promise<void> {
    const knex = getKnexFromConfig(config);
    await DBAdmin.truncateDataBaseFromKnex(knex, tables);
    knex.destroy();
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

function getKnexFromConfig(config: IncomingServerWalletConfig): Knex {
  const populatedConfig = _.assign({}, defaultConfig, config);
  return Knex(extractDBConfigFromServerWalletConfig(populatedConfig));
}
function getDbNameFromKnex(knex: Knex): string {
  return knex.client.config.connection.database;
}

function getDbNameFromConfig(config: IncomingServerWalletConfig): string {
  const populatedConfig = _.assign({}, defaultConfig, config);
  return getDatabaseConnectionConfig(populatedConfig).database;
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
  LedgerProposal,
  Funding,
  AdjudicatorStatusModel,
  ChainServiceRequest,
].map(model => model.tableName);
