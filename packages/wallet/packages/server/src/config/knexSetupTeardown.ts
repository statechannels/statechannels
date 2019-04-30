import knex from '../wallet/db/connection';

beforeAll(() => {
  return knex.migrate.rollback().then(() => {
    return knex.migrate.latest();
  });
});

beforeEach(() => {
  return knex.seed.run();
});

afterAll(() => {
  // We need to close the db connection after the test suite has run.
  // Otherwise, jest will not exit within the required one second after the test
  // suite has finished
  return knex.destroy();
});
