import Objection from 'objection';

import {Store} from '../store';
import {channel} from '../../models/__test__/fixtures/channel';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {Channel} from '../../models/channel';
import {constructKnex} from '../../../jest/knex-setup-teardown';
import {defaultTestConfig} from '../../config';
import {signState} from '../../utilities/signatures';

import {stateWithHashSignedBy} from './fixtures/states';
import {bob, alice} from './fixtures/signing-wallets';

const knex = constructKnex({pool: {max: 2}});
let tx: Objection.Transaction;

let store: Store;

beforeAll(async () => {
  store = new Store(
    knex,
    defaultTestConfig().metricsConfiguration.timingMetrics,
    defaultTestConfig().skipEvmValidation,
    '0'
  );
});

beforeEach(async () => {
  await seedAlicesSigningWallet(knex);

  // Start the transaction
  tx = await Channel.startTransaction(knex);
});

afterEach(async () => tx.rollback());

describe('signState', () => {
  let c: Channel;

  beforeEach(async () => {
    c = await Channel.query(knex)
      .insert(channel({vars: [stateWithHashSignedBy([bob()])()]}))
      .withGraphFetched('signingWallet');
  });

  it('signs the state, returning the signed state', async () => {
    await expect(Channel.query(knex).where({id: c.id})).resolves.toHaveLength(1);
    expect(c.latestSignedByMe).toBeUndefined();
    const state = {...c.vars[0], ...c.channelConstants};
    const signature = signState(state, alice().privateKey).signature;
    const result = await store.signState(c, c.vars[0], tx);
    expect(result).toMatchObject({
      ...state,
      signatures: [{signature, signer: alice().address}],
    });
  });

  it('uses a transaction', async () => {
    const updatedC = await store.signState(c, c.vars[0], tx);
    expect(updatedC).toBeDefined();

    // Fetch the current channel outside the transaction context
    const currentC = await Channel.forId(c.channelId, knex);
    expect(currentC.latestSignedByMe).toBeUndefined();

    const pendingC = await Channel.forId(c.channelId, tx);
    expect(pendingC.latestSignedByMe).toBeDefined();
  });
});
