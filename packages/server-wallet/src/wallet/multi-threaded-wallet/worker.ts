import {parentPort, isMainThread, workerData, threadId} from 'worker_threads';

import {left, right} from 'fp-ts/lib/Either';

import {createLogger} from '../../logger';
import {timerFactory} from '../../metrics';
import {ServerWalletConfig} from '../../config';
import {SingleThreadedWallet} from '..';
import {WalletEvent} from '../types';

import {isStateChannelWorkerData} from './worker-data';

startWorker();

function relayWalletEvents<E extends WalletEvent>(name: E['type']) {
  return (value: E['value']): void => {
    parentPort?.postMessage({type: 'WalletEventEmitted', name, value});
  };
}

async function startWorker() {
  // We only expect a worker thread to use one postgres connection but we enforce it just to make sure
  const walletConfig: ServerWalletConfig = {
    ...(workerData as ServerWalletConfig),
    databaseConfiguration: {
      connection: workerData.databaseConfiguration.connection,
      pool: {min: 0, max: 1},
    },
    workerThreadAmount: 0, // don't want workers to start more workers
  };

  const logger = createLogger(walletConfig).child({threadId});

  logger.debug(`Worker %o starting`, threadId);
  const wallet = await SingleThreadedWallet.create(walletConfig);

  const events = ['channelUpdated', 'objectiveStarted', 'objectiveSucceeded'] as const;
  events.forEach(name => wallet.on(name, relayWalletEvents(name)));

  parentPort?.on('message', async (message: any) => {
    if (isMainThread) {
      parentPort?.postMessage(
        left(new Error('Attempting to execute worker thread script on the main thread'))
      );
    }

    if (!isStateChannelWorkerData(message)) {
      parentPort?.postMessage(left(new Error('Incorrect worker data')));
    }

    const timer = timerFactory(
      walletConfig.metricsConfiguration?.timingMetrics || false,
      `Thread ${threadId}`
    );
    try {
      switch (message.operation) {
        case 'UpdateChannel':
          logger.debug(`Worker-%o handling UpdateChannel`, threadId);
          return parentPort?.postMessage(
            right(await timer('UpdateChannel', () => wallet.updateChannel(message.args)))
          );
        case 'PushMessage':
          logger.debug(`Worker-%o handling PushMessage`, threadId);
          return parentPort?.postMessage(
            right(await timer('PushMessage', () => wallet.pushMessage(message.args)))
          );
        case 'PushUpdate':
          logger.debug(`Worker-%o handling PushUpdate`, threadId);
          return parentPort?.postMessage(
            right(await timer('PushUpdate', () => wallet.pushUpdate(message.args)))
          );
        default:
          return parentPort?.postMessage(left(new Error('Unknown message type')));
      }
    } catch (error) {
      logger.error(error);
      return parentPort?.postMessage(left(error));
    }
  });
  logger.info(`Thread %o started`, threadId);
}
