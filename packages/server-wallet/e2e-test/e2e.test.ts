import {Participant} from '@statechannels/client-api-schema';
import {validatePayload} from '@statechannels/wallet-core';

import {alice, bob} from '../src/wallet/__test__/fixtures/signing-wallets';
import {alice as aliceP, bob as bobP} from '../src/wallet/__test__/fixtures/participants';
import {Channel} from '../src/models/channel';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';
import {SigningWallet} from '../src/models/signing-wallet';
import {stateVars} from '../src/wallet/__test__/fixtures/state-vars';
import {DBAdmin} from '../src/db-admin/db-admin';

import PayerClient from './payer/client';
import {
  killServer,
  waitForServerToStart,
  E2EServer,
  knexReceiver,
  startReceiverServer,
  triggerPayments,
  knexPayer,
} from './e2e-utils';

jest.setTimeout(100_000); // Starting up Receiver's server can take ~5 seconds

let ChannelPayer: typeof Channel;
let ChannelReceiver: typeof Channel;
let SWPayer: typeof SigningWallet;
let SWReceiver: typeof SigningWallet;

let receiverServer: E2EServer;

beforeAll(async () => {
  receiverServer = startReceiverServer();

  await waitForServerToStart(receiverServer);

  await knexPayer.migrate.latest({directory: './src/db/migrations'});
  await knexReceiver.migrate.latest({directory: './src/db/migrations'});

  [ChannelPayer, ChannelReceiver] = [knexPayer, knexReceiver].map(knex => Channel.bindKnex(knex));

  [SWPayer, SWReceiver] = [knexPayer, knexReceiver].map(knex => SigningWallet.bindKnex(knex));
});

beforeEach(async () => {
  await Promise.all([knexPayer, knexReceiver].map(knex => DBAdmin.truncateDataBaseFromKnex(knex)));

  // Adds Alice to Payer's Database
  await SWPayer.query().insert(alice());

  // Adds Bob to Receiver's Database
  await SWReceiver.query().insert(bob());
});

afterAll(async () => {
  await killServer(receiverServer);
  await knexPayer.destroy();
  await knexReceiver.destroy();
});

describe.each([0, 2])('e2e with %i worker threads', workerThreadAmount => {
  let payerClient: PayerClient;

  let payer: Participant;
  let receiver: Participant;

  beforeAll(async () => {
    // Create actors
    payerClient = await PayerClient.create(alice().privateKey, `http://127.0.0.1:65535`, {
      workerThreadAmount,
      loggingConfiguration: {logDestination: '/tmp/server-wallet.e2e-test.log', logLevel: 'trace'},
    });

    // Gets participant info for testing convenience
    payer = payerClient.me;
    receiver = await payerClient.getReceiversParticipantInfo();
  });

  afterAll(async () => {
    await payerClient.destroy();
  });

  it('can do a simple end-to-end flow with no signed states', async () => {
    const response = await payerClient.emptyMessage();
    const {signedStates, objectives} = validatePayload(response);
    expect(signedStates?.length).toBe(0);
    expect(objectives?.length).toBe(0);
  });

  it('can create a channel, send signed state via http', async () => {
    const {channelResult: channel, events} = await payerClient.createPayerChannel(receiver);

    expect(channel.participants).toStrictEqual([payer, receiver]);
    expect(channel.status).toBe('running');
    expect(channel.turnNum).toBe(3);

    expect(
      (await ChannelPayer.forId(channel.channelId, ChannelPayer.knex())).protocolState
    ).toMatchObject({supported: {turnNum: 3}});

    expect(events).toHaveLength(2);
    expect(events).toContainObject({
      event: 'objectiveStarted',
      type: 'OpenChannel',
      status: 'pending',
    });
    expect(events).toContainObject({
      event: 'objectiveSucceeded',
      type: 'OpenChannel',
      status: 'succeeded',
    });
  });
});

describe('payments', () => {
  let channelId: string;

  beforeEach(async () => {
    const [payer, receiver] = [aliceP(), bobP()];
    const seed = withSupportedState()({
      channelNonce: 123456789, // something unique for this test
      participants: [payer, receiver],
      vars: [stateVars({turnNum: 3})],
    });

    await ChannelPayer.query().insert([seed]); // Fixture uses alice() default
    await ChannelReceiver.query().insert([{...seed, signingAddress: receiver.signingAddress}]);

    channelId = seed.channelId;
  });

  const expectSupportedState = async (C: typeof Channel, turnNum: number): Promise<any> =>
    expect(C.forId(channelId, C.knex()).then(c => c.protocolState)).resolves.toMatchObject({
      latest: {turnNum},
    });

  it('can update pre-existing channel, send signed state via http', async () => {
    await expectSupportedState(ChannelPayer, 3);
    await expectSupportedState(ChannelReceiver, 3);

    await triggerPayments([channelId]);

    await expectSupportedState(ChannelPayer, 5);
    await expectSupportedState(ChannelReceiver, 5);
  });

  describe('syncing', () => {
    let payerClient: PayerClient;

    beforeAll(async () => {
      payerClient = await PayerClient.create(alice().privateKey, `http://127.0.0.1:65535`);
    });

    afterAll(async () => {
      await payerClient.destroy();
    });

    it('can update pre-existing channel, send state, but ignore reply, and sync later', async () => {
      await expectSupportedState(ChannelPayer, 3);

      const payload = await payerClient.createPayment(channelId);

      await expectSupportedState(ChannelPayer, 4);
      await expectSupportedState(ChannelReceiver, 3);

      await payerClient.messageReceiverAndExpectReply(payload); // Ignore reply

      await expectSupportedState(ChannelPayer, 4);
      await expectSupportedState(ChannelReceiver, 5);

      await payerClient.syncChannel(channelId);

      await expectSupportedState(ChannelPayer, 5);
      await expectSupportedState(ChannelReceiver, 5);
    });

    it('can update pre-existing channel, not send state, and sync later', async () => {
      await expectSupportedState(ChannelPayer, 3);

      await payerClient.createPayment(channelId); // Forget to send

      await expectSupportedState(ChannelPayer, 4);
      await expectSupportedState(ChannelReceiver, 3);

      await payerClient.syncChannel(channelId);

      await expectSupportedState(ChannelPayer, 5);
      await expectSupportedState(ChannelReceiver, 5);
    });
  });

  it('can update pre-existing channels multiple times', async () => {
    await expectSupportedState(ChannelPayer, 3);
    await expectSupportedState(ChannelReceiver, 3);

    const numPayments = 5;
    await triggerPayments([channelId], numPayments);

    await expectSupportedState(ChannelPayer, 3 + 2 * numPayments);
    await expectSupportedState(ChannelReceiver, 3 + 2 * numPayments);
  });
});
