import Objection from 'objection';
import {SignedState as WireSignedState} from '@statechannels/wire-format';

import {Store} from '../store';
import {Channel} from '../../models/channel';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {defaultConfig} from '../../config';

let store: Store;

beforeAll(async () => {
  store = new Store(knex, defaultConfig.timingMetrics, defaultConfig.skipEvmValidation);
});

describe('addSignedState', () => {
  let tx: Objection.Transaction;

  afterEach(async () => tx.rollback());

  beforeEach(async () => {
    tx = await Channel.startTransaction(knex);
  });

  const BOB_SIGNATURE =
    '0x36a5fd36a1c9a85afdeee3f9471579656eefceb08bc0ff53d194a67d6433c6385cc8c9aa049306fc7cce901f7b3345bccde311cceadc74a40a89a9d74d86d9b91b';

  const channelId = '0x00';
  it('throws when the signer is not a participant', async () => {
    const signedState: WireSignedState = {
      appData: '0x',
      appDefinition: '0x0000000000000000000000000000000000000000',
      isFinal: false,
      turnNum: 0,
      outcome: [
        {
          assetHolderAddress: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9',
          allocationItems: [
            {destination: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9', amount: '0x00'},
          ],
        },
      ],
      participants: [],
      channelNonce: 1,
      channelId,
      chainId: '0x01',
      challengeDuration: 9001,
      signatures: [BOB_SIGNATURE],
    };

    await expect(
      store.addSignedState(channelId, undefined, signedState, knex as any)
    ).rejects.toThrow(/is not a participant/);
  });
});
