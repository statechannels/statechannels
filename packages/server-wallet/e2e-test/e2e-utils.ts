import { ChildProcessWithoutNullStreams, ChildProcess, fork, spawn } from 'child_process';

import kill = require('tree-kill');
import Knex = require('knex');
import { Participant, makeDestination, makeAddress } from '@statechannels/wallet-core';
import { Wallet } from 'ethers';
import axios from 'axios';

import { withSupportedState } from '../src/models/__test__/fixtures/channel';
import { SigningWallet } from '../src/models/signing-wallet';
import { stateVars } from '../src/wallet/__test__/fixtures/state-vars';
import { Channel } from '../src/models/channel';
import {
  extractDBConfigFromServerWalletConfig,
  ServerWalletConfig,
  defaultTestConfig,
} from '../src/config';

export const payerConfig: ServerWalletConfig = { ...defaultTestConfig, postgresDBName: 'payer' };
export const receiverConfig: ServerWalletConfig = {
  ...defaultTestConfig,
  postgresDBName: 'receiver',
};

import { PerformanceTimer } from './payer/timers';

export type E2EServer = {
  url: string;
  server: ChildProcessWithoutNullStreams | ChildProcess;
};

export const triggerPayments = async (
  channelIds: string[],
  numPayments?: number
): Promise<void> => {
  let args = ['start', '--database', 'payer', '--channels', ...channelIds];

  if (numPayments) args = args.concat(['--numPayments', numPayments.toString()]);

  const payerScript = fork('./lib/e2e-test/payer/index.js', args, {});
  payerScript.on('message', message =>
    console.log(PerformanceTimer.formatResults(JSON.parse(message as any)))
  );

  return new Promise((resolve, reject) => {
    payerScript.on('exit', (code, _signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
    payerScript.on('error', reject);
  });
};
export const PAYER_PORT = 65534;
export const RECEIVER_PORT = 65535;
/**
 * Starts the Receiver Express server in a separate process. Needs to be
 * a separate process because it relies on process.env variables which
 * should not be shared between Payer and Receiver -- particularly SERVER_DB_NAME
 * which indicates that Payer and Receiver use separate databases, despite
 * conveniently re-using the same PostgreSQL instance.
 */

export const startPayerServer = (): E2EServer =>
  startServer('./lib/e2e-test/payer/server', PAYER_PORT);
export const startReceiverServer = (): E2EServer =>
  startServer('./lib/e2e-test/receiver/server', RECEIVER_PORT);

const startServer = (command: string, port: number): E2EServer => {
  const server = spawn('yarn', ['node', command], {
    stdio: 'inherit',
    env: {
      // eslint-disable-next-line no-process-env
      ...process.env,
      LOG_LEVEL: 'trace',
    },
  });

  server.on('error', data => console.error(data.toString()));
  server.stdout?.on('data', data => console.log(data.toString()));
  server.stderr?.on('data', data => console.error(data.toString()));

  return {
    server,
    url: `http://127.0.0.1:${port}`,
  };
};

/**
 * Payers the server at /reset until the API responds with OK;
 * simultaneously ensures that the server is listening and cleans
 * the database of any stale data from previous test runs.
 */
export const waitForServerToStart = (
  receiverServer: E2EServer,
  pingInterval = 1500
): Promise<void> =>
  new Promise(resolve => {
    const interval = setInterval(async () => {
      try {
        await axios.post<'OK'>(`${receiverServer.url}/status`);
        clearInterval(interval);
        resolve();
      } catch {
        return;
      }
    }, pingInterval);
  });

export const knexPayer: Knex = Knex(extractDBConfigFromServerWalletConfig(payerConfig));
export const knexReceiver: Knex = Knex(extractDBConfigFromServerWalletConfig(receiverConfig));
export const killServer = async ({ server }: E2EServer): Promise<void> => {
  kill(server.pid);
};

export async function seedTestChannels(
  payer: Participant,
  payerPrivateKey: string,
  receiver: Participant,
  receiverPrivateKey: string,
  numOfChannels: number,
  knexPayer: Knex
): Promise<string[]> {
  const channelIds: string[] = [];
  const payerSeeds = [];
  const receiverSeeds = [];
  for (let i = 0; i < numOfChannels; i++) {
    const seed = withSupportedState([
      SigningWallet.fromJson({ privateKey: payerPrivateKey }),
      SigningWallet.fromJson({ privateKey: receiverPrivateKey }),
    ])({
      vars: [stateVars({ turnNum: 3 })],
      channelNonce: i,
      participants: [payer, receiver],
    });
    payerSeeds.push({ ...seed, signingAddress: payer.signingAddress });
    receiverSeeds.push({ ...seed, signingAddress: receiver.signingAddress });
    channelIds.push(seed.channelId);
  }
  await Promise.all([
    Channel.query(knexPayer).insert(payerSeeds),
    Channel.query(knexReceiver).insert(receiverSeeds),
  ]);
  return channelIds;
}

export function getParticipant(participantId: string, privateKey: string): Participant {
  const signingAddress = makeAddress(new Wallet(privateKey).address);
  return {
    signingAddress,
    participantId,
    destination: makeDestination(signingAddress),
  };
}
