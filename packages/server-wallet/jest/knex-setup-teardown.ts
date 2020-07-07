import knex from '../src/db-admin/db-admin-connection';

beforeAll(() => knex.migrate.rollback().then(() => knex.migrate.latest()));

beforeEach(() => knex.seed.run());

afterAll(() =>
  // We need to close the db connection after the test suite has run.
  // Otherwise, jest will not exit within the required one second after the test
  // suite has finished
  knex.destroy()
);
