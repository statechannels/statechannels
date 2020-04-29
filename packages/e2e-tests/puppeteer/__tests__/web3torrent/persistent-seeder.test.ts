import {persistentSeeder} from '../../scripts/persistent-seeder';
jest.setTimeout(120000);
describe('Persistent Seeder', () => {
  it('uploads a file, approves a budget, deposits with the hub, and echoes url', async () => {
    await persistentSeeder();
    expect(true).toBe(true);
    // TODO cleanup broswers?
  });
});
