import {Wallet} from '../src/wallet';
import {DBAdmin, defaultTestConfig, overwriteConfigWithDatabaseConnection} from '../src';
import {
  seedAlicesSigningWallet,
  seedBobsSigningWallet,
} from '../src/db/seeds/1_signing_wallet_seeds';
import {Participant} from '@statechannels/client-api-schema';
import {makeDestination} from '@statechannels/wallet-core';

interface TestPeerWallets {
  a: Wallet;
  b: Wallet;
}

export const aWalletConfig = overwriteConfigWithDatabaseConnection(defaultTestConfig(), {
  database: 'TEST_A',
});
export const bWalletConfig = overwriteConfigWithDatabaseConnection(defaultTestConfig(), {
  database: 'TEST_B',
});
export let participantA: Participant;
export let participantB: Participant;
export let peerWallets: TestPeerWallets;

export function getPeersSetup(withWalletSeeding: boolean = false): jest.Lifecycle {
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
  };
}

export const peersTeardown: jest.Lifecycle = async () => {
  await Promise.all([peerWallets.a.destroy(), peerWallets.b.destroy()]);
  await Promise.all([DBAdmin.dropDatabase(aWalletConfig), DBAdmin.dropDatabase(bWalletConfig)]);
};
