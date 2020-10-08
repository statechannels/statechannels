import * as path from 'path';

import Knex from 'knex';

export class DBAdmin {
  knex: Knex;
  constructor(knex: Knex) {
    this.knex = knex;
  }

  async migrateDB(): Promise<void> {
    return this.knex.migrate.latest({directory: path.join(__dirname, '../db/migrations')});
  }
}
