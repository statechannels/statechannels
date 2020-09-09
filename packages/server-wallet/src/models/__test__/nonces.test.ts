import Knex from 'knex';
import _ from 'lodash';

import {Nonce} from '../nonce';
import {alice, bob} from '../../wallet/__test__/fixtures/participants';
import {defaultConfig, extractDBConfigFromServerWalletConfig} from '../../config';

import {nonce} from './fixtures/nonces';

const knex: Knex = Knex(extractDBConfigFromServerWalletConfig(defaultConfig));

afterEach(async () => knex('nonces').truncate());

describe('asking for a new nonce', () => {
  it('returns 0 for new addresses', () =>
    expect(Nonce.next(knex, [bob().signingAddress])).resolves.toEqual(0));

  it('returns the next nonce for existing addresses', async () => {
    await expect(Nonce.next(knex, [bob().signingAddress])).resolves.toEqual(0);
    await expect(Nonce.next(knex, [bob().signingAddress])).resolves.toEqual(1);
    await expect(Nonce.next(knex, [alice().signingAddress])).resolves.toEqual(0);
    await expect(Nonce.next(knex, [bob().signingAddress])).resolves.toEqual(2);
  });

  it('rejects when addresses is invalid', () =>
    expect(Nonce.next(knex, ['notAnAddress'])).rejects.toThrow(
      'violates check constraint "nonces_addresses_are_valid"'
    ));

  it('works concurrently', async () => {
    const nextNonce = (): Promise<number> => Nonce.next(knex, [bob().signingAddress]);
    const expected = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    const nonces = await Promise.all(expected.map(nextNonce));
    expect(_.sortBy(nonces, a => a)).toMatchObject(expected);
  });
});

describe('using a given nonce', () => {
  it('works when there is no existing nonce', () => expect(nonce().use()).resolves.toEqual(0));

  it('works the value exceeds the existing nonce', async () => {
    await expect(nonce({value: 1}).use()).resolves.toEqual(1);
    await expect(nonce({value: 3}).use()).resolves.toEqual(3);
  });

  it('rejects when the value does not exceed the existing nonce', async () => {
    await expect(nonce({value: 3}).use()).resolves.toEqual(3);
    await expect(nonce({value: 1}).use()).rejects.toThrow('Nonce too low');
    await expect(nonce({value: 4}).use()).resolves.toEqual(4);
  });
});
