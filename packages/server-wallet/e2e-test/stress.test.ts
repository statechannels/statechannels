import {Channel} from '../src/models/channel';
import {SigningWallet} from '../src/models/signing-wallet';
import knexPayer from '../src/db/connection';
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
} from './e2e-utils';
const expectSupportedState = async (
  channelId: string,
  C: typeof Channel,
  turnNum: number
): Promise<any> =>
  expect(C.forId(channelId, undefined).then(c => c.protocolState)).resolves.toMatchObject({
    latest: {turnNum},
  });

let ChannelPayer: typeof Channel;
let ChannelReceiver: typeof Channel;
let SWPayer: typeof SigningWallet;
let SWReceiver: typeof SigningWallet;

jest.setTimeout(300_000); // 5 min  since stress tests take a long time

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
    await SWPayer.query().insert(alice());

    // Adds Bob to Receiver's Database
    await SWReceiver.query().insert(bob());
  });

  it('runs the stress test with 100 channels and 1 payment call', async () => {
    const channelIds = await seedTestChannels(
      getParticipant('payer', alice().privateKey),
      alice().privateKey,
      getParticipant('receiver', bob().privateKey),
      bob().privateKey,
      100,
      knexPayer
    );

    await triggerPayments(channelIds);

    for (const channelId of channelIds) {
      await await expectSupportedState(channelId, ChannelPayer, 5);
      await expectSupportedState(channelId, ChannelReceiver, 5);
    }
  });

  it('runs the stress test with 100 channels and 25 payment call', async () => {
    const channelIds = await seedTestChannels(
      getParticipant('payer', alice().privateKey),
      alice().privateKey,
      getParticipant('receiver', bob().privateKey),
      bob().privateKey,
      100,
      knexPayer
    );
    const numPayments = 25;
    await triggerPayments(channelIds, numPayments);

    for (const channelId of channelIds) {
      await await expectSupportedState(channelId, ChannelPayer, 3 + 2 * numPayments);
      await expectSupportedState(channelId, ChannelReceiver, 3 + 2 * numPayments);
    }
  });

  afterAll(async () => {
    await killServer(receiverServer);
  });
});
