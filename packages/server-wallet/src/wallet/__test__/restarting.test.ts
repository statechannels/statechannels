import {ETH_ASSET_HOLDER_ADDRESS} from '@statechannels/wallet-core/src/config';
import waitForExpect from 'wait-for-expect';

import {defaultTestConfig, Wallet} from '..';
import {testKnex} from '../../../jest/knex-setup-teardown';
import {DBAdmin} from '../../db-admin/db-admin';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {Channel} from '../../models/channel';
import {channel} from '../../models/__test__/fixtures/channel';

import {alice, bob} from './fixtures/signing-wallets';
import {stateWithHashSignedBy} from './fixtures/states';
const registerChannelMock = jest.fn();
// This is based on jest docs on mocking es6 class mocking:
//https://jestjs.io/docs/en/es6-class-mocks
jest.mock('../../chain-service/mock-chain-service', () => {
  return {
    MockChainService: jest.fn().mockImplementation(() => {
      return {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        checkChainId: () => {},
        registerChannel: registerChannelMock,
      };
    }),
  };
});

test('the wallet registers existing channels with the chain service on starting up', async () => {
  await DBAdmin.truncateDataBaseFromKnex(testKnex);

  await seedAlicesSigningWallet(testKnex);

  const c = channel({
    channelNonce: 1,
    vars: [stateWithHashSignedBy([alice(), bob()])({turnNum: 1})],
  });
  await Channel.query(testKnex).withGraphFetched('signingWallet').insert(c);

  const w = await Wallet.create(defaultTestConfig());

  await waitForExpect(() => {
    expect(registerChannelMock).toHaveBeenCalledWith(c.channelId, [ETH_ASSET_HOLDER_ADDRESS], w);
  });

  // We explicitly call destroy on knex to avoid triggering any destroy calls on our mocked out chain service
  await w.knex.destroy();
});
