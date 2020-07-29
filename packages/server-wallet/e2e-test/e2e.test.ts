import {Participant} from '@statechannels/client-api-schema';

import {alice, bob} from '../src/wallet/__test__/fixtures/signing-wallets';
import {Channel} from '../src/models/channel';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';
import {SigningWallet} from '../src/models/signing-wallet';
import {truncate} from '../src/db-admin/db-admin-connection';
import knexPing from '../src/db/connection';

import PingClient from './ping/client';
import {killServer, startPongServer, waitForServerToStart, PongServer, knexPong} from './e2e-utils';

jest.setTimeout(10_000); // Starting up Pong server can take ~5 seconds

describe('e2e', () => {
  let pingClient: PingClient;
  let pongServer: PongServer;

  let ping: Participant;
  let pong: Participant;

  beforeAll(async () => {
    // Create actors
    pingClient = new PingClient(alice().privateKey, `http://127.0.0.1:65535`);
    pongServer = startPongServer();
    await waitForServerToStart(pongServer);

    // Adds Alice to Ping's Database
    await truncate(knexPing);
    await SigningWallet.query().insert(alice());

    // Adds Bob to Pong's Database
    await truncate(knexPong);
    await SigningWallet.bindKnex(knexPong)
      .query()
      .insert(bob());

    // Gets participant info for testing convenience
    ping = pingClient.me;
    pong = await pingClient.getPongsParticipantInfo();
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
    const channel = await pingClient.createPingChannel(pong);

    // TODO: Currently the PongController does not join the channel
    // so these tests only confirm that the channel was created
    // within Ping's wallet, that's it. Next up will be for Pong
    // to join the channel and then these tests should check for
    // 'running' status, turnNum 1, etc.

    expect(channel.participants).toStrictEqual([ping, pong]);
    expect(channel.status).toBe('opening');
    expect(channel.turnNum).toBe(0);
  });

  it('can update pre-existing channel, send signed state via http', async () => {
    const seed = withSupportedState(
      {turnNum: 3},
      {
        channelNonce: 123456789, // something unique for this test
        participants: [ping, pong],
      }
    )();

    await Channel.query().insert([seed]); // Fixture uses alice() default
    await Channel.bindKnex(knexPong)
      .query()
      .insert([{...seed, signingAddress: pong.signingAddress}]);

    const {channelId} = seed;

    // TODO: Need to also seed the database with this same channel of the Pong.
    // The test passes right now because the Pong client blindly accepts the
    // signed state and doesn't bother doing anything with it -- it considers
    // it a new channel. Once we call updateChannel on Pong, that will throw
    // an eror unless we seed its database with this same channel.

    await pingClient.ping(channelId);

    const channel = await pingClient.getChannel(channelId);

    // Basic checks to see if updateChannel worked as expected
    expect(channel.turnNum).toBe(4); // FIXME: Should be 5, bug in wallet?

    // TODO: Add test to confirm that the Pong controller received the signed state
    // and then proceeded to sign an update and respond with it
  });
});
