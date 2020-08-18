import {ethers} from 'ethers';

import {truncate} from '../../db-admin/db-admin-connection';
import knex from '../../db/connection';
import {Store} from '../store';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {SigningWallet} from '../../models/signing-wallet';

import {alice} from './fixtures/participants';

beforeEach(async () => {
  await truncate(knex);
});

describe('getFirstParticipant', () => {
  it('works', async () => {
    await expect(SigningWallet.query()).resolves.toHaveLength(0);
    const {signingAddress} = await Store.getFirstParticipant();
    expect(signingAddress).toBeDefined();
    expect(ethers.utils.isAddress(signingAddress)).toBeTruthy();

    const {signingAddress: signingAddress2} = await Store.getFirstParticipant();
    expect(signingAddress).toEqual(signingAddress2);
    await expect(SigningWallet.query()).resolves.toHaveLength(1);
  });

  it('prepopulated address returned correctly', async () => {
    await seedAlicesSigningWallet(knex);
    await expect(SigningWallet.query()).resolves.toHaveLength(1);
    const {signingAddress, participantId} = await Store.getFirstParticipant();
    expect(signingAddress).toEqual(alice().signingAddress);
    expect(participantId).toEqual(alice().signingAddress);
    await expect(SigningWallet.query()).resolves.toHaveLength(1);
  });
});
