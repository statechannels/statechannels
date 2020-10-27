import * as path from 'path';
import {promisify} from 'util';
import {exec as rawExec} from 'child_process';

const exec = promisify(rawExec);
import Knex from 'knex';

import {SigningWallet} from '../models/signing-wallet';
import {Channel} from '../models/channel';
import {Nonce} from '../models/nonce';
import {ObjectiveModel, ObjectiveChannel} from '../models/objective';
import {Funding} from '../models/funding';
import {AppBytecode} from '../models/app-bytecode';

export class DBAdmin {
  knex: Knex;
  constructor(knex: Knex) {
    this.knex = knex;
  }

  async createDB(): Promise<void> {
    await exec(`createdb ${this.dbName} $PSQL_ARGS`);
  }

  async dropDB(): Promise<void> {
    await exec(`dropdb ${this.dbName} $PSQL_ARGS`);
  }

  async migrateDB(): Promise<void> {
    const extensions = [path.extname(__filename)];
    return this.knex.migrate.latest({
      directory: path.join(__dirname, '../db/migrations'),
      loadExtensions: extensions,
    });
  }

  async truncateDB(
    tables = [
      SigningWallet.tableName,
      Channel.tableName,
      Nonce.tableName,
      ObjectiveModel.tableName,
      ObjectiveChannel.tableName,
      Funding.tableName,
      AppBytecode.tableName,
    ]
  ): Promise<void> {
    // eslint-disable-next-line no-process-env
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
      throw 'Cannot truncate unless in test or development environments';
    }
    await Promise.all(tables.map(table => this.knex.raw(`TRUNCATE TABLE ${table} CASCADE;`)));
  }

  get dbName(): string {
    return this.knex.client.config.connection.database;
  }
}
