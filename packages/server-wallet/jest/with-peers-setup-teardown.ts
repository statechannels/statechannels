import {Participant} from '@statechannels/client-api-schema';
import {makeDestination} from '@statechannels/wallet-core';

import {Wallet} from '../src/wallet';
import {DBAdmin, defaultTestConfig, overwriteConfigWithDatabaseConnection} from '../src';
import {
  seedAlicesSigningWallet,
  seedBobsSigningWallet,
} from '../src/db/seeds/1_signing_wallet_seeds';
import {MessageServiceInterface} from '../src/message-service/types';
import { createTestMessageHandler, TestMessageService } from '../src/message-service/test-message-service';


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
export let messageService: MessageServiceInterface;

export const participantIdA = 'a';
export const participantIdB = 'b';

/**
 * This destroys the peerWallet(s) and the message service and then re-instantiates them.
 * This mimics a crash and restart
 * @param walletsToRestart Specifies the peerWallet that will be restarted
 */
export async function crashAndRestart(
  walletsToRestart: 'A' | 'B' | 'Both' = 'Both'
): Promise<void> {

  await messageService.destroy();

  if (walletsToRestart === 'A' || walletsToRestart === 'Both') {
    await peerWallets.a.destroy();
    peerWallets.a = await Wallet.create(aWalletConfig);
  }

  if (walletsToRestart === 'B' || walletsToRestart === 'Both') {
    await peerWallets.b.destroy();
    peerWallets.b = await Wallet.create(bWalletConfig);
  }
  
  const handler = await createTestMessageHandler([
    {participantId: participantIdA, wallet: peerWallets.a},
    {participantId: participantIdB, wallet: peerWallets.b},
  ]);

  messageService =await  TestMessageService.createTestMessageService(handler);

}

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
      participantId: participantIdA,
      destination: makeDestination(
        '0x00000000000000000000000000000000000000000000000000000000000aaaa1'
      ),
    };
    participantB = {
      signingAddress: await peerWallets.b.getSigningAddress(),
      participantId: participantIdB,
      destination: makeDestination(
        '0x00000000000000000000000000000000000000000000000000000000000bbbb2'
      ),
    };

    const participantWallets = [
      {participantId: participantIdA, wallet: peerWallets.a},
      {participantId: participantIdB, wallet: peerWallets.b},
    ];

     
  const handler =  createTestMessageHandler(participantWallets);
  messageService =await  TestMessageService.createTestMessageService(handler);
  };
}

export const peersTeardown: jest.Lifecycle = async () => {
  await Promise.all([peerWallets.a.destroy(), peerWallets.b.destroy()]);
  await Promise.all([DBAdmin.dropDatabase(aWalletConfig), DBAdmin.dropDatabase(bWalletConfig)]);
};
