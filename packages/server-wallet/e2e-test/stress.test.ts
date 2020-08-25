import {Participant} from '@statechannels/client-api-schema';
import {Wallet} from 'ethers';
import {makeDestination} from '@statechannels/wallet-core';

import {Channel} from '../src/models/channel';
import {SigningWallet} from '../src/models/signing-wallet';
import knexPayer from '../src/db/connection';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';
import {alice, bob} from '../src/wallet/__test__/fixtures/signing-wallets';
import {truncate} from '../src/db-admin/db-admin-connection';
import {stateVars} from '../src/wallet/__test__/fixtures/state-vars';

import {
  ReceiverServer,
  waitForServerToStart,
  startReceiverServer,
  knexReceiver,
  killServer,
  triggerPayments,
  createVisualization,
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
async function seedTestChannels(
  payer: Participant,
  payerPrivateKey: string,
  receiver: Participant,
  receiverPrivateKey: string,
  numOfChannels: number
): Promise<string[]> {
  const channelIds: string[] = [];
  for (let i = 0; i < numOfChannels; i++) {
    const seed = withSupportedState([
      SigningWallet.fromJson({privateKey: payerPrivateKey}),
      SigningWallet.fromJson({privateKey: receiverPrivateKey}),
    ])({
      vars: [stateVars({turnNum: 3})],
      channelNonce: i,
      participants: [payer, receiver],
    });
    await Channel.bindKnex(knexPayer)
      .query()
      .insert([{...seed, signingAddress: payer.signingAddress}]); // Fixture uses alice() default
    await Channel.bindKnex(knexReceiver)
      .query()
      .insert([{...seed, signingAddress: receiver.signingAddress}]);
    channelIds.push(seed.channelId);
  }
  return channelIds;
}

function getParticipant(participantId: string, privateKey: string): Participant {
  const signingAddress = new Wallet(privateKey).address;
  return {
    signingAddress,
    participantId,
    destination: makeDestination(signingAddress),
  };
}
describe('Stress tests', () => {
  let receiverServer: ReceiverServer;
  beforeAll(async () => {
    receiverServer = startReceiverServer();
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
      10
    );

    const profileFile = await triggerPayments(channelIds);

    for (const channelId of channelIds) {
      await await expectSupportedState(channelId, ChannelPayer, 5);
      await expectSupportedState(channelId, ChannelReceiver, 5);
    }

    await createVisualization(profileFile, './profiling-data/stress-test-1.html');
  });

  it('runs the stress test with 100 channels and 25 payment call', async () => {
    const channelIds = await seedTestChannels(
      getParticipant('payer', alice().privateKey),
      alice().privateKey,
      getParticipant('receiver', bob().privateKey),
      bob().privateKey,
      2
    );
    const numPayments = 25;
    const profileFile = await triggerPayments(channelIds, numPayments);

    for (const channelId of channelIds) {
      await await expectSupportedState(channelId, ChannelPayer, 3 + 2 * numPayments);
      await expectSupportedState(channelId, ChannelReceiver, 3 + 2 * numPayments);
    }

    await createVisualization(profileFile, './profiling-data/stress-test-2.html');
  });

  afterAll(async () => {
    await killServer(receiverServer);
  });
});
