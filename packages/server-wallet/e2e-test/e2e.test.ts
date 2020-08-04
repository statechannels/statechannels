import * as childProcess from 'child_process';

import {Participant} from '@statechannels/client-api-schema';

import {alice, bob} from '../src/wallet/__test__/fixtures/signing-wallets';
import {alice as aliceP, bob as bobP} from '../src/wallet/__test__/fixtures/participants';
import {Channel} from '../src/models/channel';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';
import {SigningWallet} from '../src/models/signing-wallet';
import {truncate} from '../src/db-admin/db-admin-connection';
import knexPayer from '../src/db/connection';
import {logger} from '../src/logger';

import PayerClient from './payer/client';
import {
  killServer,
  waitForServerToStart,
  ReceiverServer,
  knexReceiver,
  startReceiverServer,
} from './e2e-utils';

jest.setTimeout(20_000); // Starting up Pong server can take ~5 seconds

let ChannelPayer: typeof Channel;
let ChannelReceiver: typeof Channel;
let SWPayer: typeof SigningWallet;
let SWReceiver: typeof SigningWallet;

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

afterAll(async () => {
  await killServer(receiverServer);
});

describe('e2e', () => {
  let payerClient: PayerClient;

  let payer: Participant;
  let receiver: Participant;

  beforeAll(async () => {
    // Create actors
    payerClient = new PayerClient(alice().privateKey, `http://127.0.0.1:65535`);

    // Gets participant info for testing convenience
    payer = payerClient.me;
    receiver = await payerClient.getReceiversParticipantInfo();
  });

  it('can do a simple end-to-end flow with no signed states', async () => {
    const ret = await payerClient.emptyMessage();
    expect(ret.sender).toBe('receiver');
    expect(ret.recipient).toBe('payer');
    expect(ret.data.signedStates?.length).toBe(0);
    expect(ret.data.objectives?.length).toBe(0);
  });

  it('can create a channel, send signed state via http', async () => {
    const channel = await payerClient.createPayerChannel(receiver);

    expect(channel.participants).toStrictEqual([payer, receiver]);
    expect(channel.status).toBe('funding');
    expect(channel.turnNum).toBe(0);

    expect((await Channel.forId(channel.channelId, undefined)).protocolState).toMatchObject({
      supported: {turnNum: 0},
    });
  });
});

describe('payments', () => {
  let channelId: string;

  const triggerPayments = async (numPayments?: number): Promise<void> => {
    let args = [
      'ts-node',
      'e2e-test/e2e-utils/payer.ts',
      '--database',
      'payer',
      '--channels',
      channelId,
    ];

    if (numPayments) args = args.concat(['--numPayments', numPayments.toString()]);

    const payerScript = childProcess.spawn(`yarn`, args);
    payerScript.on('error', logger.error);
    await new Promise(resolve => payerScript.on('exit', resolve));
  };

  beforeEach(async () => {
    const [payer, receiver] = [aliceP(), bobP()];
    const seed = withSupportedState(
      {turnNum: 3},
      {
        channelNonce: 123456789, // something unique for this test
        participants: [payer, receiver],
      }
    )();

    await ChannelPayer.query().insert([seed]); // Fixture uses alice() default
    await ChannelReceiver.query().insert([{...seed, signingAddress: receiver.signingAddress}]);

    channelId = seed.channelId;
  });

  const expectSupportedState = async (C: typeof Channel, turnNum: number): Promise<any> =>
    expect(C.forId(channelId, undefined).then(c => c.protocolState)).resolves.toMatchObject({
      latest: {turnNum},
    });

  it('can update pre-existing channel, send signed state via http', async () => {
    await expectSupportedState(ChannelPayer, 3);
    await expectSupportedState(ChannelReceiver, 3);

    await triggerPayments();

    await expectSupportedState(ChannelPayer, 5);
    await expectSupportedState(ChannelReceiver, 5);
  });

  it('can update pre-existing channels multiple times', async () => {
    await expectSupportedState(ChannelPayer, 3);
    await expectSupportedState(ChannelReceiver, 3);

    const numPayments = 5;
    await triggerPayments(numPayments);

    await expectSupportedState(ChannelPayer, 3 + 2 * numPayments);
    await expectSupportedState(ChannelReceiver, 3 + 2 * numPayments);
  });
});
