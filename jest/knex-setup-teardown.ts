import knex from '../src/db-admin/db-admin-connection';

beforeAll(async () => {
  await knex.migrate.rollback();
  await knex.migrate.latest();
});

afterEach(() => knex('channels').truncate());
afterAll(() =>
  // We need to close the db connection after the test suite has run.
  // Otherwise, jest will not exit within the required one second after the test
  // suite has finished
  knex.destroy()
);
