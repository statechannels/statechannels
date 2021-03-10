import {Participant} from '@statechannels/client-api-schema';
import {makeDestination} from '@statechannels/wallet-core';

import {Wallet} from '../src/wallet';
import {DBAdmin, defaultTestConfig, overwriteConfigWithDatabaseConnection} from '../src';
import {
  seedAlicesSigningWallet,
  seedBobsSigningWallet,
} from '../src/db/seeds/1_signing_wallet_seeds';
import {MessageServiceInterface} from '../src/message-service/types';
import {setupTestMessagingService} from '../src/message-service/test-message-service';

interface TestPeerWallets {
  a: Wallet;
  b: Wallet;
}

export const aWalletConfig = overwriteConfigWithDatabaseConnection(defaultTestConfig(), {
  database: 'server_wallet_test_a',
});
export const bWalletConfig = overwriteConfigWithDatabaseConnection(defaultTestConfig(), {
  database: 'server_wallet_test_b',
});
export let participantA: Participant;
export let participantB: Participant;
export let peerWallets: TestPeerWallets;
/**
 * A messaging service that links the two peer wallets.
 * If this is not used it will have no effect.
 * It can be used to automatically transport messages between the two participants.
 */
export let messagingService: MessageServiceInterface;

export function getPeersSetup(withWalletSeeding = false): jest.Lifecycle {
  return async () => {
    await Promise.all([DBAdmin.dropDatabase(aWalletConfig), DBAdmin.dropDatabase(bWalletConfig)]);

    await Promise.all([
      DBAdmin.createDatabase(aWalletConfig),
      DBAdmin.createDatabase(bWalletConfig),
    ]);

    await Promise.all([
      DBAdmin.migrateDatabase(aWalletConfig),
      DBAdmin.migrateDatabase(bWalletConfig),
    ]);

    peerWallets = {
      a: await Wallet.create(aWalletConfig),
      b: await Wallet.create(bWalletConfig),
    };

    if (withWalletSeeding) {
      await seedAlicesSigningWallet(peerWallets.a.knex);
      await seedBobsSigningWallet(peerWallets.b.knex);
    }

    participantA = {
      signingAddress: await peerWallets.a.getSigningAddress(),
      participantId: 'a',
      destination: makeDestination(
        '0x00000000000000000000000000000000000000000000000000000000000aaaa1'
      ),
    };
    participantB = {
      signingAddress: await peerWallets.b.getSigningAddress(),
      participantId: 'b',
      destination: makeDestination(
        '0x00000000000000000000000000000000000000000000000000000000000bbbb2'
      ),
    };

    messagingService = await setupTestMessagingService([
      {participantId: participantA.participantId, wallet: peerWallets.a},
      {participantId: participantB.participantId, wallet: peerWallets.b},
    ]);
  };
}

export const peersTeardown: jest.Lifecycle = async () => {
  await Promise.all([peerWallets.a.destroy(), peerWallets.b.destroy()]);
  await Promise.all([DBAdmin.dropDatabase(aWalletConfig), DBAdmin.dropDatabase(bWalletConfig)]);
};
