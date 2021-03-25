import {Participant} from '@statechannels/client-api-schema';
import {makeDestination} from '@statechannels/wallet-core';

import {Engine} from '../src/engine';
import {DBAdmin, defaultTestConfig, overwriteConfigWithDatabaseConnection} from '../src';
import {
  seedAlicesSigningWallet,
  seedBobsSigningWallet,
} from '../src/db/seeds/1_signing_wallet_seeds';
import {MessageServiceInterface} from '../src/message-service/types';
import { createTestMessageHandler, TestMessageService } from '../src/message-service/test-message-service';


interface TestPeerEngines {
  a: Engine;
  b: Engine;
}

export const aEngineConfig = overwriteConfigWithDatabaseConnection(defaultTestConfig(), {
  database: 'server_wallet_test_a',
});
export const bEngineConfig = overwriteConfigWithDatabaseConnection(defaultTestConfig(), {
  database: 'server_wallet_test_b',
});
export let participantA: Participant;
export let participantB: Participant;
export let peerEngines: TestPeerEngines;

/**
 * A messaging service that links the two peer engines.
 * If this is not used it will have no effect.
 * It can be used to automatically transport messages between the two participants.
 */
export let messageService: TestMessageService;

export const participantIdA = 'a';
export const participantIdB = 'b';

/**
 * This destroys the peerEngine(s) and the message service and then re-instantiates them.
 * This mimics a crash and restart
 * @param enginesToRestart Specifies the peerEngines that will be restarted
 */
export async function crashAndRestart(
  enginesToRestart: 'A' | 'B' | 'Both' = 'Both'
): Promise<void> {

  await messageService.destroy();

  if (enginesToRestart === 'A' || enginesToRestart === 'Both') {
    await peerEngines.a.destroy();
    peerEngines.a = await Engine.create(aEngineConfig);
  }

  if (enginesToRestart === 'B' || enginesToRestart === 'Both') {
    await peerEngines.b.destroy();
    peerEngines.b = await Engine.create(bEngineConfig);
  }
  
  const handler = await createTestMessageHandler([
    {participantId: participantIdA, engine: peerEngines.a},
    {participantId: participantIdB, engine: peerEngines.b},
  ]);

  messageService =await  TestMessageService.create(handler) as TestMessageService;

}

export function getPeersSetup(withWalletSeeding = false): jest.Lifecycle {
  return async () => {
    await Promise.all([DBAdmin.dropDatabase(aEngineConfig), DBAdmin.dropDatabase(bEngineConfig)]);

    await Promise.all([
      DBAdmin.createDatabase(aEngineConfig),
      DBAdmin.createDatabase(bEngineConfig),
    ]);

    await Promise.all([
      DBAdmin.migrateDatabase(aEngineConfig),
      DBAdmin.migrateDatabase(bEngineConfig),
    ]);

    peerEngines = {
      a: await Engine.create(aEngineConfig),
      b: await Engine.create(bEngineConfig),
    };

    if (withWalletSeeding) {
      await seedAlicesSigningWallet(peerEngines.a.knex);
      await seedBobsSigningWallet(peerEngines.b.knex);
    }

    participantA = {
      signingAddress: await peerEngines.a.getSigningAddress(),
      participantId: participantIdA,
      destination: makeDestination(
        '0x00000000000000000000000000000000000000000000000000000000000aaaa1'
      ),
    };
    participantB = {
      signingAddress: await peerEngines.b.getSigningAddress(),
      participantId: participantIdB,
      destination: makeDestination(
        '0x00000000000000000000000000000000000000000000000000000000000bbbb2'
      ),
    };

    const participantEngines = [
      {participantId: participantIdA, engine: peerEngines.a},
      {participantId: participantIdB, engine: peerEngines.b},
    ];

     
  const handler =  createTestMessageHandler(participantEngines);
  messageService =await  TestMessageService.create(handler) as TestMessageService;
  };
}

export const peersTeardown: jest.Lifecycle = async () => {
  await messageService.destroy();
  await Promise.all([peerEngines.a.destroy(), peerEngines.b.destroy()]);
  await Promise.all([DBAdmin.dropDatabase(aEngineConfig), DBAdmin.dropDatabase(bEngineConfig)]);
};
