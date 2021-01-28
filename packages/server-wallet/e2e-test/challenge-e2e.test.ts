import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {utils} from 'ethers';

import {stateVars} from '../src/wallet/__test__/fixtures/state-vars';
import {alice as aliceP, bob as bobP} from '../src/wallet/__test__/fixtures/participants';
import {alice, bob} from '../src/wallet/__test__/fixtures/signing-wallets';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';
import {ServerWalletConfig} from '../src';
import {Channel} from '../src/models/channel';
import {SigningWallet} from '../src/models/signing-wallet';
import {DBAdmin} from '../src/db-admin/db-admin';
import {AdjudicatorStatusModel} from '../src/models/adjudicator-status';

import PayerClient from './payer/client';
import {LOG_PATH} from './logger';
import {knexReceiver, knexPayer, payerConfig} from './e2e-utils';

jest.setTimeout(100_000); // Starting up Receiver's server can take ~5 seconds

describe('challenging', () => {
  let payerClient: PayerClient;
  let ChannelPayer: typeof Channel;
  let ChannelReceiver: typeof Channel;
  let SWPayer: typeof SigningWallet;
  let SWReceiver: typeof SigningWallet;
  // eslint-disable-next-line no-process-env
  const chainNetworkID = Number.parseInt(process.env.CHAIN_NETWORK_ID ?? '9002');

  // eslint-disable-next-line no-process-env
  const provider = process.env.RPC_ENDPOINT;
  // eslint-disable-next-line no-process-env
  const pk = process.env.CHAIN_SERVICE_PK2 ?? ETHERLIME_ACCOUNTS[2].privateKey;
  const config: ServerWalletConfig = {
    ...payerConfig,
    loggingConfiguration: {logLevel: 'trace', logDestination: LOG_PATH},
    networkConfiguration: {chainNetworkID},
    chainServiceConfiguration: {
      attachChainService: true,
      provider,
      pk,
      allowanceMode: 'MaxUint',
    },
  };
  const CHALLENGE_DURATION = 86_400; // One day in seconds
  afterAll(async () => {
    await payerClient.destroy();
    await knexPayer.destroy();
    await knexReceiver.destroy();
  });
  let channelId: string;
  beforeAll(async () => {
    await knexPayer.migrate.latest({directory: './src/db/migrations'});
    await knexReceiver.migrate.latest({directory: './src/db/migrations'});

    [ChannelPayer, ChannelReceiver] = [knexPayer, knexReceiver].map(knex => Channel.bindKnex(knex));

    [SWPayer, SWReceiver] = [knexPayer, knexReceiver].map(knex => SigningWallet.bindKnex(knex));
  });

  beforeEach(async () => {
    await Promise.all(
      [knexPayer, knexReceiver].map(knex => DBAdmin.truncateDataBaseFromKnex(knex))
    );

    // Adds Alice to Payer's Database
    await SWPayer.query().insert(alice());

    // Adds Bob to Receiver's Database
    await SWReceiver.query().insert(bob());

    const [payer, receiver] = [aliceP(), bobP()];
    const seed = withSupportedState()({
      channelNonce: 987654321, // something unique for this test
      participants: [payer, receiver],
      vars: [stateVars({turnNum: 3})],
      chainId: utils.hexlify(chainNetworkID),
      challengeDuration: CHALLENGE_DURATION,
      // Set a random address so this will be a "ledger" channel
      assetHolderAddress: '0xC4d65072D3a32E6E25D5A97c857D892D6aa6F2A4',
    });

    await ChannelPayer.query().insert([{...seed, initialSupport: seed.support}]); // Fixture uses alice() default
    await ChannelReceiver.query().insert([
      {...seed, initialSupport: seed.support, signingAddress: receiver.signingAddress},
    ]);

    channelId = seed.channelId;
    payerClient = await PayerClient.create(alice().privateKey, `http://127.0.0.1:65535`, config);
  });

  it('can challenge', async () => {
    await payerClient.challenge(channelId);
    await payerClient.mineBlocks(5);
    const {channelMode} = await AdjudicatorStatusModel.getAdjudicatorStatus(knexPayer, channelId);
    expect(channelMode).toEqual('Challenge');

    await payerClient.mineFutureBlock(CHALLENGE_DURATION);

    const {channelMode: reloadedChannelMode} = await AdjudicatorStatusModel.getAdjudicatorStatus(
      knexPayer,
      channelId
    );
    expect(reloadedChannelMode).toEqual('Finalized');
  });
});
