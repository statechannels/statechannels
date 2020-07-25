import knex from '../src/db/connection';
import {truncate} from '../src/db-admin/db-admin-connection';
import {seed as seedSigningWallets} from '../src/db/seeds/1_signing_wallet_seeds';
import {seed as seedChannels} from '../src/db/seeds/2_channel_seeds';

import PingClient from './ping/client';

describe('e2e', () => {
  let pingClient: PingClient;

  beforeAll(async () => {
    // eslint-disable-next-line
    const pongServerAddress = process.env.SERVER_ADDRESS as string;

    pingClient = new PingClient(pongServerAddress);

    console.log('Truncating database before e2e tests suites run');
    await truncate(knex);

    console.log('Seeding shared database with stuff');
    await seedSigningWallets(knex);
    await seedChannels();
  });

  it('can create a channel via http', async () => {
    await pingClient.createPingChannel();
    // TODO: The above line should send an HTTP request to Pong, and then Pong should
    // respond with a message in the response to Ping who should store the value in their
    // DB. To verify it all worked we should have some kind of function on Ping to check
    // the latest turnNum it has in its DB for this channel and likewise for Pong over HTTP
  });

  it.skip('can update a channel via http', async () => {
    await pingClient.ping();
  });
});
