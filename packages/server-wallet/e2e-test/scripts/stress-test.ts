import autocannon from 'autocannon';

import {
  waitForServerToStart,
  startReceiverServer,
  knexReceiver,
  killServer,
  // triggerPayments,
  seedTestChannels,
  getParticipant,
  knexPayer,
  startPayerServer,
  PAYER_PORT,
} from '../e2e-utils';
import {alice, bob} from '../../src/wallet/__test__/fixtures/signing-wallets';
import {truncate} from '../../src/db-admin/db-admin-connection';
import {SigningWallet} from '../../src/models/signing-wallet';

(async function(): Promise<void> {
  const duration = 60;
  const numChannels = 25;

  const receiverServer = startReceiverServer();
  const payerServer = startPayerServer();
  await waitForServerToStart(receiverServer);
  await waitForServerToStart(payerServer);

  const [SWPayer, SWReceiver] = [knexPayer, knexReceiver].map(knex => SigningWallet.bindKnex(knex));
  await Promise.all([knexPayer, knexReceiver].map(db => truncate(db)));
  // Adds Alice to Payer's Database
  await SWPayer.query(knexPayer).insert(alice());

  // Adds Bob to Receiver's Database
  await SWReceiver.query(knexReceiver).insert(bob());

  const channelIds = await seedTestChannels(
    getParticipant('payer', alice().privateKey),
    alice().privateKey,
    getParticipant('receiver', bob().privateKey),
    bob().privateKey,
    numChannels,
    knexPayer
  );

  const urls = channelIds.map(c => `http://localhost:${PAYER_PORT}/makePayment?channelId=${c}`);
  const results = await autocannon({url: urls as any, connections: numChannels, duration});
  console.log(results);
  await killServer(receiverServer);
  await killServer(payerServer);
  await knexReceiver.destroy();
  await knexPayer.destroy();
})();
