import knex from '../src/db/connection';
import {truncate} from '../src/db-admin/db-admin-connection';
import {seed} from '../src/db/seeds/1_signing_wallet_seeds';

import PingClient from './ping/client';

// eslint-disable-next-line
const pongAddress = process.env.SERVER_ADDRESS as string;

beforeAll(async () => {
  console.log('Truncating database before e2e tests suites run');
  await truncate(knex);
});

describe('e2e', () => {
  beforeEach(async () => {
    // TODO: Does not work right now, also both Wallets re-use the same DB
    console.log('Seeding database of both parties with stuff');
    await seed(knex);
  });

  it('can do an update channel via http', async () => {
    const client = new PingClient(
      '0xb9500857552943ae5ef6c2a046e311560c296c474aa47a3d13614d1ac98bd1a6',
      pongAddress
    );
    await client.ping();
    // TODO: The above line should send an HTTP request to Pong, and then Pong should
    // respond with a message in the response to Ping who should store the value in their
    // DB. To verify it all worked we should have some kind of function on Ping to check
    // the latest turnNum it has in its DB for this channel and likewise for Pong over HTTP
  });
});
