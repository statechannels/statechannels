import {Store} from '../store';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {defaultTestConfig} from '../../config';
import {channel} from '../../models/__test__/fixtures/channel';

import {stateWithHashSignedBy} from './fixtures/states';
import {alice, bob} from './fixtures/signing-wallets';

let store: Store;

beforeAll(async () => {
  store = new Store(
    knex,
    defaultTestConfig().metricsConfiguration.timingMetrics,
    defaultTestConfig().skipEvmValidation,
    '0'
  );
});

describe('addSignedState', () => {
  it('throws when the signer is not me', async () => {
    const stateSignedByBob = stateWithHashSignedBy([bob()])();
    const channelWithAliceAsSigner = channel();
    await expect(
      store.addMyState(channelWithAliceAsSigner, stateSignedByBob, knex as any)
    ).rejects.toThrow(/This state not exclusively signed by me/);
  });

  it('throws when there are multiple signers (me and someone else)', async () => {
    // This is bad since the other person's signature will not be validated
    const stateSignedByBob = stateWithHashSignedBy([bob(), alice()])();
    const channelWithAliceAsSigner = channel();
    await expect(
      store.addMyState(channelWithAliceAsSigner, stateSignedByBob, knex as any)
    ).rejects.toThrow(/This state not exclusively signed by me/);
  });

  it('does not throw when the signer is me', async () => {
    const stateSignedByAlice = stateWithHashSignedBy([alice()])();
    const channelWithAliceAsSigner = channel();
    await expect(
      store.addMyState(channelWithAliceAsSigner, stateSignedByAlice, knex as any)
    ).resolves.not.toThrow();
  });
});
