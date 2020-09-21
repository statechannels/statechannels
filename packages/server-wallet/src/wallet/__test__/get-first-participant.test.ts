import {ethers} from 'ethers';

import {truncate} from '../../db-admin/db-admin-connection';
import {Store} from '../store';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {SigningWallet} from '../../models/signing-wallet';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {defaultConfig, extractDBConfigFromServerWalletConfig} from '../../config';

import {alice} from './fixtures/participants';

beforeEach(async () => {
  await truncate(knex);
});

const store = new Store(
  extractDBConfigFromServerWalletConfig(defaultConfig),
  defaultConfig.timingMetrics,
  defaultConfig.skipEvmValidation
);

describe('getFirstParticipant', () => {
  it('works', async () => {
    await expect(SigningWallet.query(knex)).resolves.toHaveLength(0);
    const {signingAddress} = await store.getFirstParticipant();
    expect(signingAddress).toBeDefined();
    expect(ethers.utils.isAddress(signingAddress)).toBeTruthy();

    const {signingAddress: signingAddress2} = await store.getFirstParticipant();
    expect(signingAddress).toEqual(signingAddress2);
    await expect(SigningWallet.query(knex)).resolves.toHaveLength(1);
  });

  it('prepopulated address returned correctly', async () => {
    await seedAlicesSigningWallet(knex);
    await expect(SigningWallet.query(knex)).resolves.toHaveLength(1);
    const {signingAddress, participantId} = await store.getFirstParticipant();
    expect(signingAddress).toEqual(alice().signingAddress);
    expect(participantId).toEqual(alice().signingAddress);
    await expect(SigningWallet.query(knex)).resolves.toHaveLength(1);
  });
});
