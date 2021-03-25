/* eslint-disable no-process-env */
import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {utils, providers, constants} from 'ethers';
import {BN, makeAddress, Participant} from '@statechannels/wallet-core';

import {stateVars} from '../src/wallet/__test__/fixtures/state-vars';
import {alice as aliceP, bob as bobP} from '../src/wallet/__test__/fixtures/participants';
import {alice} from '../src/wallet/__test__/fixtures/signing-wallets';
import {channel, withSupportedState} from '../src/models/__test__/fixtures/channel';
import {defaultTestNetworkConfiguration, EngineConfig, EngineEvent} from '../src';
import {Channel} from '../src/models/channel';
import {DBAdmin} from '../src/db-admin/db-admin';
import {AdjudicatorStatusModel} from '../src/models/adjudicator-status';
import {seedAlicesSigningWallet} from '../src/db/seeds/1_signing_wallet_seeds';

import PayerClient from './payer/client';
import {LOG_PATH} from './logger';
import {knexPayer, payerConfig} from './e2e-utils';

jest.setTimeout(100_000);

const ETH_ASSET_HOLDER_ADDRESS = makeAddress(
  process.env.ETH_ASSET_HOLDER_ADDRESS || constants.AddressZero
);

const ChannelPayer = Channel.bindKnex(knexPayer);

const provider = process.env.RPC_ENDPOINT;
const pk = process.env.CHAIN_SERVICE_PK2 ?? ETHERLIME_ACCOUNTS[2].privateKey;

const config: EngineConfig = {
  ...payerConfig,
  loggingConfiguration: {logLevel: 'trace', logDestination: LOG_PATH},
  networkConfiguration: defaultTestNetworkConfiguration,
  chainServiceConfiguration: {
    attachChainService: true,
    provider,
    pk,
    allowanceMode: 'MaxUint',
  },
};

const challengeDuration = channel().challengeDuration;
const [payer, receiver] = [aliceP(), bobP()];
const [payerAmount, receiverAmount] = [1, 3];

let payerClient: PayerClient;
beforeEach(async () => {
  await DBAdmin.migrateDatabaseFromKnex(knexPayer);
  await seedAlicesSigningWallet(knexPayer);
});

afterAll(async () => {
  await payerClient.destroy();
  await knexPayer.destroy();
});

test('the engine handles the basic challenging v0 behavior', async () => {
  const channelId = await insertChannel();

  payerClient = await PayerClient.create(alice().privateKey, 'fake_url', config);
  // Make sure the channel has funds so the defund will work
  await fundChannel(payerClient, channelId);

  // We expect both payer and receiver to have no funds in their destination
  const initPayerBalance = await getBalance(payerClient.provider, payer);
  const initReceiverBalance = await getBalance(payerClient.provider, receiver);
  expect(initPayerBalance).toBe(0);
  expect(initReceiverBalance).toBe(0);

  // We expect the channel to be in an open status
  expect(await getChannelMode(channelId)).toEqual('Open');

  const events: EngineEvent[] = [];
  const names = ['objectiveStarted', 'objectiveSucceeded'] as const;
  names.map(event => payerClient.engine.on(event, e => events.push({...e, event})));

  // Call challenge and mine blocks
  await payerClient.challenge(channelId);

  /*
  the way it should probably work is that SubmitChallenge objective should get replaced by
  the Challenge objective, which succeeds after
  - the channel is challenged
  - challenge times out
  - funds are withdrawn (edited)

  But for now, the objectives succeeds straight away.
  */
  expect(events).toHaveLength(2);
  expect(events).toContainObject({event: 'objectiveStarted', type: 'SubmitChallenge'});
  expect(events).toContainObject({event: 'objectiveSucceeded', type: 'SubmitChallenge'});

  await payerClient.mineBlocks(5);

  // We expect that the challenge should be detected by the engine
  expect(await getChannelMode(channelId)).toEqual('Challenge');

  // Mine a block with a timestamp of current + CHALLENGE_DURATION
  // this triggers the challenge expiry
  await payerClient.mineFutureBlock(challengeDuration);

  // We expect the channel to be marked as finalized
  expect(await getChannelMode(channelId)).toEqual('Finalized');

  expect(events).toHaveLength(4);
  expect(events).toContainObject({event: 'objectiveStarted', type: 'DefundChannel'});
  expect(events).toContainObject({event: 'objectiveSucceeded', type: 'DefundChannel'});

  // We expect the balances to be updated based on the outcome
  const finalPayerBalance = await getBalance(payerClient.provider, payer);
  const finalReceiverBalance = await getBalance(payerClient.provider, receiver);
  expect(finalPayerBalance).toBe(payerAmount);
  expect(finalReceiverBalance).toBe(receiverAmount);
});

// Helpers
async function fundChannel(payerClient: PayerClient, channelId: string) {
  const amount = BN.add(payerAmount, receiverAmount);
  const transResponse = await payerClient.engine.chainService.fundChannel({
    amount,
    channelId,
    assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
    expectedHeld: BN.from(0),
  });
  await transResponse.wait();
}

async function insertChannel() {
  const seed = withSupportedState()({
    vars: [
      stateVars({
        turnNum: 3,
      }),
    ],
    chainId: utils.hexlify(defaultTestNetworkConfiguration.chainNetworkID),
    challengeDuration: challengeDuration,
    assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  });

  await ChannelPayer.query().insert([{...seed, initialSupport: seed.support}]); // Fixture uses alice() default
  return seed.channelId;
}

async function getChannelMode(channelId: string) {
  return (await AdjudicatorStatusModel.getAdjudicatorStatus(knexPayer, channelId)).channelMode;
}

async function getBalance(
  provider: providers.JsonRpcProvider,
  participant: Participant
): Promise<number> {
  const address = `0x${participant.destination.slice(-40)}`;
  return (await provider.getBalance(address)).toNumber();
}
