import Objection from 'objection';

import {Store} from '../store';
import {Channel} from '../../models/channel';
import {addHash} from '../../state-utils';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';

import {createState} from './fixtures/states';
import {alice} from './fixtures/signing-wallets';

describe('addSignedState', () => {
  let tx: Objection.Transaction;

  afterEach(async () => tx.rollback());

  beforeEach(async () => {
    tx = await Channel.startTransaction(knex);
  });

  const BOB_SIGNATURE =
    '0x36a5fd36a1c9a85afdeee3f9471579656eefceb08bc0ff53d194a67d6433c6385cc8c9aa049306fc7cce901f7b3345bccde311cceadc74a40a89a9d74d86d9b91b';
  it('throws on an invalid signature', async () => {
    const signedState = addHash({
      ...createState(),
      signatures: [{signer: alice().address, signature: BOB_SIGNATURE}],
    });

    await expect(Store.addSignedState(undefined, signedState, knex)).rejects.toThrow(
      'Invalid signature'
    );
  });
});
