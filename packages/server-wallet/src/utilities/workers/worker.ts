import {parentPort, isMainThread, workerData} from 'worker_threads';

import {hashState} from '@statechannels/wallet-core';
import {left, right} from 'fp-ts/lib/Either';

import {fastRecoverAddress, fastSignState} from '../signatures';
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
      case 'HashState':
        return parentPort?.postMessage(right(await hashState(message.state)));

      case 'RecoverAddress':
        return parentPort?.postMessage(
          await fastRecoverAddress(message.state, message.signature, message.state.stateHash)
        );
      case 'SignState':
        return parentPort?.postMessage(
          right(await fastSignState(message.state, message.privateKey))
        );
      case 'UpdateChannel':
        return parentPort?.postMessage(right(await wallet._updateChannel(message.args)));
      case 'PushMessage':
        return parentPort?.postMessage(right(await wallet._pushMessage(message.args)));
    }
  } catch (error) {
    return parentPort?.postMessage(left(error));
  }
});
