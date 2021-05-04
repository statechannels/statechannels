import path from 'path';
import * as fs from 'fs';

import {Participant} from '@statechannels/client-api-schema';
import {makeDestination} from '@statechannels/wallet-core';
import {Logger} from 'pino';

import {Engine} from '../src/engine';
import {DBAdmin, defaultTestConfig, overwriteConfigWithDatabaseConnection, Wallet} from '../src';
import {
  seedAlicesSigningWallet,
  seedBobsSigningWallet,
} from '../src/db/seeds/1_signing_wallet_seeds';
import {TestMessageService} from '../src/message-service/test-message-service';
import {createLogger} from '../src/logger';
import {LegacyEngineMessageHandler} from '../src/message-service/legacy-engine-message-service';

interface TestPeerEngines {
  a: Engine;
  b: Engine;
}

export interface TestPeerWallets {
  a: Wallet;
  b: Wallet;
}
const DEFAULT__RETRY_OPTIONS = {numberOfAttempts: 100, initialDelay: 100, multiple: 1};

const aDatabase = 'server_wallet_test_a';
const bDatabase = 'server_wallet_test_b';

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
  database: aDatabase,
});
export const bEngineConfig = overwriteConfigWithDatabaseConnection(baseConfig, {
  database: bDatabase,
});

const logger: Logger = createLogger(baseConfig);

export type PeerSetup = {
  peerEngines: TestPeerEngines;
  participantA: Participant;
  participantB: Participant;
  messageService: LegacyEngineMessageHandler;
  peerWallets: TestPeerWallets;
};

export const participantIdA = 'a';
export const participantIdB = 'b';
const destinationA = makeDestination(
  '0x00000000000000000000000000000000000000000000000000000000000aaaa1'
);
const destinationB = makeDestination(
  '0x00000000000000000000000000000000000000000000000000000000000bbbb2'
);
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

    const restartA = enginesToRestart === 'A' || enginesToRestart === 'Both';
    const restartB = enginesToRestart === 'B' || enginesToRestart === 'Both';

    if (restartA) {
      await oldPeerSetup.peerWallets.a.destroy();
    }
    if (restartB) {
      await oldPeerSetup.peerWallets.b.destroy();
    }
    const a = restartA ? await Engine.create(aEngineConfig) : oldPeerSetup.peerEngines.a;

    const b = restartB ? await Engine.create(bEngineConfig) : oldPeerSetup.peerEngines.b;

    const participantA = {
      signingAddress: await a.getSigningAddress(),
      participantId: participantIdA,
      destination: destinationA,
    };
    const participantB = {
      signingAddress: await b.getSigningAddress(),
      participantId: participantIdB,
      destination: destinationB,
    };

    const walletA = await Wallet.create(a, TestMessageService.create, DEFAULT__RETRY_OPTIONS);
    const walletB = await Wallet.create(b, TestMessageService.create, DEFAULT__RETRY_OPTIONS);
    // TestMessageService.linkMessageServices(walletA.messageService, walletB.messageService);
    const participantEngines = [
      {participantId: participantIdA, engine: a},
      {participantId: participantIdB, engine: b},
    ];

    return {
      peerEngines: {a, b},
      peerWallets: {a: walletA, b: walletB},
      messageService: new LegacyEngineMessageHandler(participantEngines),
      participantA,
      participantB,
    };
  } catch (error) {
    logger.error(error, 'CrashAndRestart failed');
    throw error;
  }
}

export async function getPeersSetup(withWalletSeeding = false): Promise<PeerSetup> {
  try {
    await Promise.all([
      DBAdmin.truncateDatabase(aEngineConfig),
      DBAdmin.truncateDatabase(bEngineConfig),
    ]);

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
      destination: destinationA,
    };
    const participantB = {
      signingAddress: await peerEngines.b.getSigningAddress(),
      participantId: participantIdB,
      destination: destinationB,
    };

    const participantEngines = [
      {participantId: participantIdA, engine: peerEngines.a},
      {participantId: participantIdB, engine: peerEngines.b},
    ];

    const messageService = new LegacyEngineMessageHandler(participantEngines);
    const peerWallets = {
      a: await Wallet.create(peerEngines.a, TestMessageService.create, DEFAULT__RETRY_OPTIONS),
      b: await Wallet.create(peerEngines.b, TestMessageService.create, DEFAULT__RETRY_OPTIONS),
    };
    TestMessageService.linkMessageServices(
      peerWallets.a.messageService,
      peerWallets.b.messageService
    );
    logger.trace('getPeersSetup complete');
    return {
      peerEngines,
      peerWallets,
      messageService,
      participantA,
      participantB,
    };
  } catch (error) {
    logger.error(error, 'getPeersSetup failed');
    throw error;
  }
}

export const teardownPeerSetup = async (peerSetup: PeerSetup): Promise<void> => {
  if (!peerSetup) {
    logger.warn('No PeerSetup so no teardown needed');
    return;
  }
  try {
    const {messageService, peerWallets} = peerSetup;
    await messageService.destroy();

    await Promise.all([peerWallets.a.destroy(), peerWallets.b.destroy()]);

    await Promise.all([
      DBAdmin.truncateDatabase(aEngineConfig),
      DBAdmin.truncateDatabase(bEngineConfig),
    ]);
  } catch (error) {
    logger.error(error, 'peersTeardown failed');
    throw error;
  }
};
