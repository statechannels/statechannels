import {parentPort, isMainThread, workerData, threadId} from 'worker_threads';

import {left, right} from 'fp-ts/lib/Either';
import P from 'pino';

import {timerFactory} from '../../metrics';
import {IncomingEngineConfigV2, SingleThreadedEngine} from '..';

import {isStateChannelWorkerData} from './worker-data';

startWorker();

async function startWorker() {
  const {engineConfig, parentLogger} = workerData as {
    engineConfig: IncomingEngineConfigV2;
    parentLogger: P.Logger;
  };

  const logger = parentLogger.child({threadId});

  logger.debug(`Worker %o starting`, threadId);
  const engine = await SingleThreadedEngine.create(engineConfig, logger);

  parentPort?.on('message', async (message: any) => {
    if (isMainThread) {
      parentPort?.postMessage(
        left(new Error('Attempting to execute worker thread script on the main thread'))
      );
    }

    if (!isStateChannelWorkerData(message)) {
      parentPort?.postMessage(left(new Error('Incorrect worker data')));
    }

    const timer = timerFactory(engineConfig.metrics?.timingMetrics || false, `Thread ${threadId}`);
    try {
      switch (message.operation) {
        case 'UpdateChannel':
          logger.debug(`Worker-%o handling UpdateChannel`, threadId);
          return parentPort?.postMessage(
            right(await timer('UpdateChannel', () => engine.updateChannel(message.args)))
          );
        case 'PushMessage':
          logger.debug(`Worker-%o handling PushMessage`, threadId);
          return parentPort?.postMessage(
            right(await timer('PushMessage', () => engine.pushMessage(message.args)))
          );
        case 'PushUpdate':
          logger.debug(`Worker-%o handling PushUpdate`, threadId);
          return parentPort?.postMessage(
            right(await timer('PushUpdate', () => engine.pushUpdate(message.args)))
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
