import Knex from 'knex';

import {Channel} from '../src/models/channel';
import {SigningWallet} from '../src/models/signing-wallet';
import {alice, bob} from '../src/wallet/__test__/fixtures/signing-wallets';
import {truncate} from '../src/db-admin/db-admin-connection';

import {
  ReceiverServer,
  waitForServerToStart,
  startReceiverServer,
  knexReceiver,
  killServer,
  triggerPayments,
  seedTestChannels,
  getParticipant,
  knexPayer,
} from './e2e-utils';
const expectSupportedState = async (
  knex: Knex,
  channelId: string,
  C: typeof Channel,
  turnNum: number
): Promise<any> =>
  expect(C.forId(channelId, knex).then(c => c.protocolState)).resolves.toMatchObject({
    latest: {turnNum},
  });

let ChannelPayer: typeof Channel;
let ChannelReceiver: typeof Channel;
let SWPayer: typeof SigningWallet;
let SWReceiver: typeof SigningWallet;

jest.setTimeout(600_000); // 10 min  since stress tests take a long time

describe('Stress tests', () => {
  let receiverServer: ReceiverServer;
  beforeAll(async () => {
    receiverServer = await startReceiverServer();
    await waitForServerToStart(receiverServer);

    [ChannelPayer, ChannelReceiver] = [knexPayer, knexReceiver].map(knex => Channel.bindKnex(knex));
    [SWPayer, SWReceiver] = [knexPayer, knexReceiver].map(knex => SigningWallet.bindKnex(knex));
  });
  beforeEach(async () => {
    await Promise.all([knexPayer, knexReceiver].map(db => truncate(db)));
    // Adds Alice to Payer's Database
    await SWPayer.query(knexPayer).insert(alice());

    // Adds Bob to Receiver's Database
    await SWReceiver.query(knexReceiver).insert(bob());
  });

  const numPayments = 100;
  const numChannels = 25;
  it(`runs the stress test with ${numChannels} channels and ${numPayments} payment calls`, async () => {
    const channelIds = await seedTestChannels(
      getParticipant('payer', alice().privateKey),
      alice().privateKey,
      getParticipant('receiver', bob().privateKey),
      bob().privateKey,
      100,
      knexPayer
    );

    await triggerPayments(channelIds, numPayments);

    for (const channelId of channelIds) {
      await await expectSupportedState(knexPayer, channelId, ChannelPayer, 3 + 2 * numPayments);
      await expectSupportedState(knexReceiver, channelId, ChannelReceiver, 3 + 2 * numPayments);
    }
  });

  afterAll(async () => {
    await killServer(receiverServer);
    await knexReceiver.destroy();
    await knexPayer.destroy();
  });
});
