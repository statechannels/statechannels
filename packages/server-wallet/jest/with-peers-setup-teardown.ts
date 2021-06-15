import path from 'path';
import * as fs from 'fs';

import {Participant} from '@statechannels/client-api-schema';
import {makeDestination} from '@statechannels/wallet-core';
import {Logger} from 'pino';
import {utils} from 'ethers';

import {
  Engine,
  extractDBConfigFromWalletConfig,
  EngineConfig,
  defaultTestWalletConfig,
  overwriteConfigWithDatabaseConnection,
} from '../src/engine';
import {DBAdmin, SyncOptions, Wallet} from '../src';
import {
  seedAlicesSigningWallet,
  seedBobsSigningWallet,
} from '../src/db/seeds/1_signing_wallet_seeds';
import {TestMessageService} from '../src/message-service/test-message-service';
import {createLogger} from '../src/logger';
import {LegacyTestMessageHandler} from '../src/message-service/legacy-test-message-service';

interface TestPeerEngines {
  a: Engine;
  b: Engine;
}

export interface TestPeerWallets {
  a: Wallet;
  b: Wallet;
}
const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  pollInterval: 50,
  staleThreshold: 1_000,
  timeOutThreshold: 45_000,
};

const aDatabase = 'server_wallet_test_a';
const bDatabase = 'server_wallet_test_b';

const ARTIFACTS_DIR = '../../artifacts';
try {
  fs.mkdirSync(ARTIFACTS_DIR);
} catch (err) {
  if (err.message !== `EEXIST: file already exists, mkdir '${ARTIFACTS_DIR}'`) throw err;
}
const baseConfig = defaultTestWalletConfig({
  loggingConfiguration: {
    logLevel: 'trace',
    logDestination: path.join(ARTIFACTS_DIR, 'with-peers.log'),
  },
});
export const aWalletConfig = overwriteConfigWithDatabaseConnection(baseConfig, {
  database: aDatabase,
});

export const bWalletConfig = overwriteConfigWithDatabaseConnection(baseConfig, {
  database: bDatabase,
});

const {skipEvmValidation, metricsConfiguration: metrics} = baseConfig;
const baseEngineConfig = {
  skipEvmValidation,
  metrics,
  chainNetworkID: utils.hexlify(baseConfig.networkConfiguration.chainNetworkID),
  workerThreadAmount: 0,
};
export const aEngineConfig: EngineConfig = {
  ...baseEngineConfig,
  dbConfig: extractDBConfigFromWalletConfig(aWalletConfig),
};

export const bEngineConfig: EngineConfig = {
  ...baseEngineConfig,
  dbConfig: extractDBConfigFromWalletConfig(bWalletConfig),
};

const logger: Logger = createLogger(baseConfig);

export type PeerSetup = {
  peerEngines: TestPeerEngines;
  participantA: Participant;
  participantB: Participant;
  messageService: LegacyTestMessageHandler;
};

export type PeerSetupWithWallets = PeerSetup & {peerWallets: TestPeerWallets};
const isPeerSetupWithWallets = (
  setup: PeerSetupWithWallets | PeerSetup
): setup is PeerSetupWithWallets => 'peerWallets' in setup;
export const participantIdA = 'a';
export const participantIdB = 'b';
const destinationA = makeDestination(
  '0x00000000000000000000000000000000000000000000000000000000000aaaa1'
);
const destinationB = makeDestination(
  '0x00000000000000000000000000000000000000000000000000000000000bbbb2'
);

export async function setupPeerWallets(withWalletsSeeding = false): Promise<PeerSetupWithWallets> {
  const peerSetup = await setupPeerEngines(withWalletsSeeding);

  const peerWallets = {
    a: await Wallet.create(aWalletConfig, TestMessageService.create, DEFAULT_SYNC_OPTIONS),
    b: await Wallet.create(bWalletConfig, TestMessageService.create, DEFAULT_SYNC_OPTIONS),
  };
  TestMessageService.linkMessageServices(
    peerWallets.a.messageService,
    peerWallets.b.messageService
  );
  return {...peerSetup, peerWallets};
}

export async function setupPeerEngines(withWalletSeeding = false): Promise<PeerSetup> {
  try {
    await Promise.all([
      DBAdmin.truncateDatabase(aWalletConfig),
      DBAdmin.truncateDatabase(bWalletConfig),
    ]);

    await Promise.all([
      DBAdmin.createDatabase(aWalletConfig),
      DBAdmin.createDatabase(bWalletConfig),
    ]);

    await Promise.all([
      DBAdmin.migrateDatabase(aWalletConfig),
      DBAdmin.migrateDatabase(bWalletConfig),
    ]);

    const peerEngines = {
      a: await Engine.create(aEngineConfig, createLogger(aWalletConfig)),
      b: await Engine.create(bEngineConfig, createLogger(bWalletConfig)),
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

    const messageService = new LegacyTestMessageHandler(participantEngines);

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

export const teardownPeerSetup = async (
  peerSetup: PeerSetup | PeerSetupWithWallets
): Promise<void> => {
  if (!peerSetup) {
    logger.warn('No PeerSetup so no teardown needed');
    return;
  }
  try {
    const {messageService, peerEngines} = peerSetup;
    await messageService.destroy();
    if (isPeerSetupWithWallets(peerSetup)) {
      const {peerWallets} = peerSetup;
      await Promise.all([peerWallets.a.destroy(), peerWallets.b.destroy()]);
    } else {
      await Promise.all([peerEngines.a.destroy(), peerEngines.b.destroy()]);
    }
    await Promise.all([
      DBAdmin.truncateDatabase(aWalletConfig),
      DBAdmin.truncateDatabase(bWalletConfig),
    ]);
  } catch (error) {
    logger.error(error, 'peersTeardown failed');
    throw error;
  }
};
