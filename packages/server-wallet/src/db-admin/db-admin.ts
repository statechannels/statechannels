import * as path from 'path';
import {promisify} from 'util';
import {exec as rawExec} from 'child_process';
const exec = promisify(rawExec);

import Knex from 'knex';

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
    return this.knex.migrate.latest({directory: path.join(__dirname, '../db/migrations')});
  }

  async truncateDB(): Promise<void> {
    const tables = ['signing_wallets', 'channels', 'nonces'];
    await Promise.all(tables.map(table => this.knex.raw(`TRUNCATE TABLE ${table} CASCADE;`)));
  }

  get dbName(): string {
    return this.knex.client.config.connection.database;
  }
}
