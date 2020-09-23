import {parentPort, isMainThread, workerData} from 'worker_threads';

import {left, right} from 'fp-ts/lib/Either';

import {Wallet} from '../..';
import {ServerWalletConfig} from '../../config';

import {isStateChannelWorkerData} from './worker-data';

const wallet = new Wallet(workerData as ServerWalletConfig);

parentPort?.on('message', async (message: any) => {
  if (isMainThread) {
    parentPort?.postMessage(
      left(new Error('Attempting to execute worker thread script on the main thread'))
    );
  }

  if (!isStateChannelWorkerData(message)) {
    parentPort?.postMessage(left(new Error('Incorrect worker data')));
  }
  try {
    switch (message.operation) {
      case 'UpdateChannel':
        return parentPort?.postMessage(right(await wallet._updateChannel(message.args)));
      case 'PushMessage':
        return parentPort?.postMessage(right(await wallet._pushMessage(message.args)));
      default:
        // TODO: Ensure that Error class is serialized properly
        return parentPort?.postMessage(left(new Error('Unknown message type')));
    }
  } catch (error) {
    return parentPort?.postMessage(left(error));
  }
});
