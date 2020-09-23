import Objection from 'objection';

import {Store} from '../store';
import {Channel} from '../../models/channel';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {defaultConfig} from '../../config';
import {channel} from '../../models/__test__/fixtures/channel';

import {stateWithHashSignedBy2} from './fixtures/states';
import {alice, bob} from './fixtures/signing-wallets';

const store = new Store(defaultConfig.timingMetrics, defaultConfig.skipEvmValidation);

describe('addSignedState', () => {
  let tx: Objection.Transaction;

  afterEach(async () => tx.rollback());

  beforeEach(async () => {
    tx = await Channel.startTransaction(knex);
  });

  it('throws when the signer is not me', async () => {
    const stateSignedByBob = stateWithHashSignedBy2([bob()])();
    const channelWithAliceAsSigner = channel();
    await expect(
      store.addMyState(channelWithAliceAsSigner, stateSignedByBob, knex as any)
    ).rejects.toThrow(/This state not exclusively signed by me/);
  });

  it('throws when there are multiple signers (me and someone else)', async () => {
    // This is bad since the other person's signature will not be validated
    const stateSignedByBob = stateWithHashSignedBy2([bob(), alice()])();
    const channelWithAliceAsSigner = channel();
    await expect(
      store.addMyState(channelWithAliceAsSigner, stateSignedByBob, knex as any)
    ).rejects.toThrow(/This state not exclusively signed by me/);
  });

  it('does not throw when the signer is me', async () => {
    const stateSignedByAlice = stateWithHashSignedBy2([alice()])();
    const channelWithAliceAsSigner = channel();
    await expect(
      store.addMyState(channelWithAliceAsSigner, stateSignedByAlice, knex as any)
    ).resolves.not.toThrow();
  });
});
