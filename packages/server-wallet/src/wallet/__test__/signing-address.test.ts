import {ethers} from 'ethers';
import {Transaction} from 'objection';

import {truncate} from '../../db-admin/db-admin-connection';
import knex from '../../db/connection';
import {Store} from '../store';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';

import {alice} from './fixtures/participants';

const tx = {} as Transaction;
beforeEach(async () => {
  await truncate(knex);
});

describe('signingAddress', () => {
  it('generate address then get address', async () => {
    const signingAddress = await Store.getOrCreateSigningAddress(tx);
    expect(signingAddress).toBeDefined();
    expect(ethers.utils.isAddress(signingAddress)).toBeTruthy();

    const signingAddress2 = await Store.getOrCreateSigningAddress(tx);
    expect(signingAddress).toEqual(signingAddress2);
  });

  it('prepopulated address returned correctly', async () => {
    await seedAlicesSigningWallet(knex);
    const signingAddress = await Store.getOrCreateSigningAddress(tx);
    expect(signingAddress).toEqual(alice().signingAddress);
  });
});
