import {Participant} from '@statechannels/client-api-schema';
import {makeDestination} from '@statechannels/wallet-core';
import {Logger} from 'pino';

import {Engine} from '../src/engine';
import {DBAdmin, defaultTestConfig, overwriteConfigWithDatabaseConnection} from '../src';
import {
  seedAlicesSigningWallet,
  seedBobsSigningWallet,
} from '../src/db/seeds/1_signing_wallet_seeds';
import {
  createTestMessageHandler,
  TestMessageService,
} from '../src/message-service/test-message-service';
import {createLogger} from '../src/logger';
import path from 'path';
import * as fs from 'fs';

interface TestPeerEngines {
  a: Engine;
  b: Engine;
}
const ARTIFACTS_DIR = '../../artifacts';
try {
  fs.mkdirSync(ARTIFACTS_DIR);
} catch (err) {
  if (err.message !== "EEXIST: file already exists, mkdir '../../artifacts'") throw err;
}
const baseConfig = defaultTestConfig({
  loggingConfiguration: {logLevel: 'trace', logDestination:  path.join(ARTIFACTS_DIR, 'with-peers.log')},
});
export const aEngineConfig = overwriteConfigWithDatabaseConnection(baseConfig, {
  database: 'server_wallet_test_a',
});
export const bEngineConfig = overwriteConfigWithDatabaseConnection(baseConfig, {
  database: 'server_wallet_test_b',
});

const logger: Logger = createLogger(baseConfig);
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
  try {
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

    messageService = (await TestMessageService.create(handler)) as TestMessageService;
  } catch (error) {
    logger.error(error, 'CrashAndRestart failed');
    throw error;
  }
}

export function getPeersSetup(withWalletSeeding = false): jest.Lifecycle {
  return async () => {
    try {
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

      const handler = createTestMessageHandler(participantEngines);
      messageService = (await TestMessageService.create(handler)) as TestMessageService;
    } catch (error) {
      logger.error(error, 'getPeersSetup failed');
      throw error;
    }
  };
}

export const peersTeardown: jest.Lifecycle = async () => {
try{
  await messageService.destroy();
  await Promise.all([peerEngines.a.destroy(), peerEngines.b.destroy()]);
  await Promise.all([DBAdmin.dropDatabase(aEngineConfig), DBAdmin.dropDatabase(bEngineConfig)]);
  } catch (error) {
      logger.error(error, 'peersTeardown failed');
      throw error;
    }
};
