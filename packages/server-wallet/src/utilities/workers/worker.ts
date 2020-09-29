import {parentPort, isMainThread, workerData, threadId} from 'worker_threads';

import {left, right} from 'fp-ts/lib/Either';

import {createLogger} from '../../logger';
import {Wallet} from '../..';
import {timerFactory} from '../../metrics';
import {ServerWalletConfig} from '../../config';

import {isStateChannelWorkerData} from './worker-data';

const walletConfig = workerData as ServerWalletConfig;
const logger = createLogger(walletConfig);

logger.debug(`Worker %o starting`, threadId);
const wallet = new Wallet(walletConfig);
parentPort?.on('message', async (message: any) => {
  if (isMainThread) {
    parentPort?.postMessage(
      left(new Error('Attempting to execute worker thread script on the main thread'))
    );
  }

  if (!isStateChannelWorkerData(message)) {
    parentPort?.postMessage(left(new Error('Incorrect worker data')));
  }

  const timer = timerFactory(walletConfig.timingMetrics, `Thread ${threadId}`);
  try {
    switch (message.operation) {
      case 'UpdateChannel':
        logger.debug(`Worker-%o handling UpdateChannel`, threadId);
        return parentPort?.postMessage(
          right(
            await timer('UpdateChannel', async () => wallet.updateChannelInternal(message.args))
          )
        );
      case 'PushMessage':
        logger.debug(`Worker-%o handling PushMessage`, threadId);
        return parentPort?.postMessage(
          right(await timer('PushMessage', async () => wallet.pushMessageInternal(message.args)))
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
