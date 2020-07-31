import {Participant} from '@statechannels/client-api-schema';

import {alice, bob} from '../src/wallet/__test__/fixtures/signing-wallets';
import {Channel} from '../src/models/channel';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';
import {SigningWallet} from '../src/models/signing-wallet';
import {truncate} from '../src/db-admin/db-admin-connection';
import knexPing from '../src/db/connection';
import {knexPong, startPongServer, waitForServerToStart, killServer} from '../e2e-test/e2e-utils';
import PingClient from '../e2e-test/ping/client';

async function seedTestChannels(
  ping: Participant,
  pingPrivateKey: string,
  pong: Participant,
  pongPrivateKey: string,
  numOfChannels: number
): Promise<string[]> {
  const channelIds = [];
  for (let i = 0; i < numOfChannels; i++) {
    const seed = withSupportedState(
      {turnNum: 3},
      {
        channelNonce: i,
        participants: [ping, pong],
      },
      [
        SigningWallet.fromJson({privateKey: pingPrivateKey}),
        SigningWallet.fromJson({privateKey: pongPrivateKey}),
      ]
    )();
    await Channel.bindKnex(knexPing)
      .query()
      .insert([{...seed, signingAddress: ping.signingAddress}]); // Fixture uses alice() default
    await Channel.bindKnex(knexPong)
      .query()
      .insert([{...seed, signingAddress: pong.signingAddress}]);
    channelIds.push(seed.channelId);
  }
  return channelIds;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
(async function() {
  // configureEnvVariables();
  const pongServer = startPongServer();
  await waitForServerToStart(pongServer);

  // Adds Alice to Ping's Database
  await truncate(knexPing);

  await SigningWallet.query(knexPing).insert(alice());

  // Adds Bob to Pong's Database
  await truncate(knexPong);
  await SigningWallet.bindKnex(knexPong)
    .query()
    .insert(bob());

  const pingClient = new PingClient(alice().privateKey, `http://127.0.0.1:65535`);

  console.log('seeding channels');
  const channelIds = await seedTestChannels(
    pingClient.me,
    alice().privateKey,
    await pingClient.getPongsParticipantInfo(),
    bob().privateKey,
    100
  );

  console.log('Starting test');
  console.time('one ping one pong 100 channels');
  const pingPromises = channelIds.map(c => pingClient.ping(c));
  await Promise.all(pingPromises);
  console.timeEnd('one ping one pong 100 channels');
  await killServer(pongServer);
})();
