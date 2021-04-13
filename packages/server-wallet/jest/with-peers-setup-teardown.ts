import path from 'path';
import * as fs from 'fs';

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

interface TestPeerEngines {
  a: Engine;
  b: Engine;
}
const ARTIFACTS_DIR = '../../artifacts';
try {
  fs.mkdirSync(ARTIFACTS_DIR);
} catch (err) {
  if (err.message !== `EEXIST: file already exists, mkdir '${ARTIFACTS_DIR}'`) throw err;
}
const baseConfig = defaultTestConfig({
  loggingConfiguration: {
    logLevel: 'trace',
    logDestination: path.join(ARTIFACTS_DIR, 'with-peers.log'),
  },
});
export const aEngineConfig = overwriteConfigWithDatabaseConnection(baseConfig, {
  database: 'server_wallet_test_a',
});
export const bEngineConfig = overwriteConfigWithDatabaseConnection(baseConfig, {
  database: 'server_wallet_test_b',
});

const logger: Logger = createLogger(baseConfig);

export type PeerSetup = {
  peerEngines: TestPeerEngines;
  participantA: Participant;
  participantB: Participant;
  messageService: TestMessageService;
};

export const participantIdA = 'a';
export const participantIdB = 'b';

/**
 * This destroys the peerEngine(s) and the message service and then re-instantiates them.
 * This mimics a crash and restart
 * @param enginesToRestart Specifies the peerEngines that will be restarted
 */
export async function crashAndRestart(
  oldPeerSetup: PeerSetup,
  enginesToRestart: 'A' | 'B' | 'Both'
): Promise<PeerSetup> {
  try {
    await oldPeerSetup.messageService.destroy();

    const a =
      enginesToRestart === 'A' || enginesToRestart === 'Both'
        ? await Engine.create(aEngineConfig)
        : oldPeerSetup.peerEngines.a;

    const b =
      enginesToRestart === 'B' || enginesToRestart === 'Both'
        ? await Engine.create(bEngineConfig)
        : oldPeerSetup.peerEngines.b;

    const handler = await createTestMessageHandler([
      {participantId: participantIdA, engine: a},
      {participantId: participantIdB, engine: b},
    ]);

    const messageService = (await TestMessageService.create(
      handler,
      a.logger
    )) as TestMessageService;

    return {
      peerEngines: {a, b},
      messageService,
      participantA: oldPeerSetup.participantA,
      participantB: oldPeerSetup.participantB,
    };
  } catch (error) {
    logger.error(error, 'CrashAndRestart failed');
    throw error;
  }
}

export async function getPeersSetup(withWalletSeeding = false): Promise<PeerSetup> {
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

    const peerEngines = {
      a: await Engine.create(aEngineConfig),
      b: await Engine.create(bEngineConfig),
    };

    if (withWalletSeeding) {
      await seedAlicesSigningWallet(peerEngines.a.knex);
      await seedBobsSigningWallet(peerEngines.b.knex);
    }

    const participantA = {
      signingAddress: await peerEngines.a.getSigningAddress(),
      participantId: participantIdA,
      destination: makeDestination(
        '0x00000000000000000000000000000000000000000000000000000000000aaaa1'
      ),
    };
    const participantB = {
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

    const handler = createTestMessageHandler(participantEngines, peerEngines.a.logger);
    const messageService = (await TestMessageService.create(
      handler,
      peerEngines.a.logger
    )) as TestMessageService;

    logger.trace('getPeersSetup complete');
    return {
      peerEngines,
      messageService,
      participantA,
      participantB,
    };
  } catch (error) {
    logger.error(error, 'getPeersSetup failed');
    throw error;
  }
}

export const peersTeardown = async (peerSetup: PeerSetup): Promise<void> => {
  try {
    const {messageService, peerEngines} = peerSetup;
    await messageService.destroy();

    await Promise.all([peerEngines.a.destroy(), peerEngines.b.destroy()]);
    await Promise.all([DBAdmin.dropDatabase(aEngineConfig), DBAdmin.dropDatabase(bEngineConfig)]);
  } catch (error) {
    if (error.message === 'aborted') {
      // When we destroy the engines there still may open knex connections due to our use of delay in the TestMessageService
      // These throw an abort error that can make the test output messy
      // We just swallow the error here to avoid it
      logger.trace({error}, 'Ignoring knex aborted error');
      return;
    }
    logger.error(error, 'peersTeardown failed');
    throw error;
  }
};
