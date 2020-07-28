import {simpleEthAllocation, BN} from '@statechannels/wallet-core';

import knex from '../src/db/connection';
import {seed as seedSigningWallets} from '../src/db/seeds/1_signing_wallet_seeds';
import {alice, bob} from '../src/wallet/__test__/fixtures/participants';
import {Channel} from '../src/models/channel';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';

import PingClient from './ping/client';
import {
  killServer,
  startPongServer,
  waitForServerToStartAndResetDatabase,
  PongServer,
} from './e2e-utils';

jest.setTimeout(10_000); // Starting up Pong server can take ~5 seconds

describe('e2e', () => {
  let pingClient: PingClient;
  let pongServer: PongServer;

  beforeAll(async () => {
    pongServer = startPongServer();

    // ⚠️ You must create a new database locally called 'pong', like so:
    // ❯ createdb pong
    // ❯ SERVER_DB_NAME=pong NODE_ENV=development yarn db:migrate
    await waitForServerToStartAndResetDatabase(pongServer);

    pingClient = new PingClient(`http://127.0.0.1:65535`);

    await seedSigningWallets(knex);
  });

  afterAll(() => killServer(pongServer));

  it('can do a simple end-to-end flow with no signed states', async () => {
    const ret = await pingClient.emptyMessage();
    expect(ret.sender).toBe('pong');
    expect(ret.recipient).toBe('ping');
    expect(ret.data.signedStates?.length).toBe(0);
    expect(ret.data.objectives?.length).toBe(0);
  });

  it('can create a channel, send signed state via http', async () => {
    const channel = await pingClient.createPingChannel();

    // TODO: Currently the PongController does not join the channel
    // so these tests only confirm that the channel was created
    // within Ping's wallet, that's it. Next up will be for Pong
    // to join the channel and then these tests should check for
    // 'running' status, turnNum 1, etc.

    expect(channel.participants).toStrictEqual([alice(), bob()]);
    expect(channel.status).toBe('opening');
    expect(channel.turnNum).toBe(0);
  });

  it('can update pre-existing channel, send signed state via http', async () => {
    const seed = withSupportedState({
      outcome: simpleEthAllocation([{amount: BN.from(5), destination: alice().destination}]),
      turnNum: 3,
    })();

    await Channel.query().insert([seed]);

    // TODO: Need to also seed the database with this same channel of the Pong

    await pingClient.ping(seed.channelId);

    // TODO: Add test to confirm that the Pong controller received the signed state
    // and then proceeded to sign an update and respond with it
  });
});
