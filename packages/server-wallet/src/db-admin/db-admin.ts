import * as path from 'path';
import {promisify} from 'util';
import {exec as rawExec} from 'child_process';

const exec = promisify(rawExec);
import Knex from 'knex';

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
import {extractDBConfigFromServerWalletConfig, ServerWalletConfig} from '../config';

/**
 * A collection of static utility methods for db admin
 */
export class DBAdmin {
  /**
   * Creates a database based on the database specified in the wallet configuration
   * @param config The wallet configuration object containing the database configuration to use
   */
  static async createDatabase(config: ServerWalletConfig): Promise<void> {
    const knex = Knex(extractDBConfigFromServerWalletConfig(config));
    await DBAdmin.createDatabaseFromKnex(knex);
    knex.destroy();
  }

  /**
   * Creates the database specified in the knex instance connection info.
   * @param knex The knex instance which should have a db name specified
   */
  static async createDatabaseFromKnex(knex: Knex): Promise<void> {
    await exec(`createdb ${getDbName(knex)} $PSQL_ARGS`);
  }

  /**
   * Drops the database based on the database specified in the wallet configuration
   * @param config The wallet configuration object containing the database configuration to use
   */
  static async dropDatabase(config: ServerWalletConfig): Promise<void> {
    const knex = Knex(extractDBConfigFromServerWalletConfig(config));
    await DBAdmin.dropDatabaseFromKnex(knex);
    knex.destroy();
  }

  /**
   * Drops the database specified in the knex instance connection info.
   * @param knex The knex instance which should have a db name specified
   */
  static async dropDatabaseFromKnex(knex: Knex): Promise<void> {
    await exec(`dropdb ${getDbName(knex)} --if-exists $PSQL_ARGS`);
  }

  /**
   * Performs wallet database migrations against the database specified in the config
   * @param config The wallet configuration object containing the database configuration to use
   */
  static async migrateDatabase(config: ServerWalletConfig): Promise<void> {
    const knex = Knex(extractDBConfigFromServerWalletConfig(config));
    await DBAdmin.migrateDatabaseFromKnex(knex);
    knex.destroy();
  }

  /**
   * Performs wallet database migrations for the given knex instance.
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
   * @param tables A list of table names to truncate. Defaults to ALL tables.
   */
  static async truncateDatabase(config: ServerWalletConfig, tables = defaultTables): Promise<void> {
    const knex = Knex(extractDBConfigFromServerWalletConfig(config));
    await DBAdmin.truncateDataBaseFromKnex(knex, tables);
    knex.destroy();
  }

  /**
   * Truncates data from all the specified tables
   * @param knex A connected knex instance
   * @param tables A list of table names to truncate. Defaults to ALL tables.
   */
  static async truncateDataBaseFromKnex(knex: Knex, tables = defaultTables): Promise<void> {
    // eslint-disable-next-line no-process-env
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
      throw 'Cannot truncate unless in test or development environments';
    }
    await Promise.all(tables.map(table => knex.raw(`TRUNCATE TABLE ${table} CASCADE;`)));
  }
}

// helpers
function getDbName(knex: Knex): string {
  return knex.client.config.connection.database;
}
const defaultTables = [
  SigningWallet.tableName,
  Channel.tableName,
  Nonce.tableName,
  ObjectiveModel.tableName,
  ObjectiveChannelModel.tableName,
  Funding.tableName,
  AppBytecode.tableName,
  LedgerRequest.tableName,
  LedgerProposal.tableName,
  Funding.tableName,
  AdjudicatorStatusModel.tableName,
  ChainServiceRequest.tableName,
];
