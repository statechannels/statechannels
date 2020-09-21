import {parentPort, isMainThread} from 'worker_threads';

import {hashState} from '@statechannels/wallet-core';

import {fastRecoverAddress, fastSignState} from '../signatures';
import {Wallet} from '../..';
import {defaultConfig} from '../../config';
import {logger} from '../../logger';

import {isStateChannelWorkerData} from './worker-data';

const wallet = new Wallet(defaultConfig);

parentPort?.on('message', async (message: any) => {
  if (isMainThread) {
    throw new Error('Attempting to execute worker thread script on the main thread');
  }

  if (!isStateChannelWorkerData(message)) {
    logger.error({message}, 'Incorrect worker data');
    throw new Error('Incorrect worker data');
  }
  switch (message.operation) {
    case 'HashState':
      return parentPort?.postMessage(await hashState(message.state));

    case 'RecoverAddress':
      return parentPort?.postMessage(
        await fastRecoverAddress(message.state, message.signature, message.state.stateHash)
      );
    case 'SignState':
      return parentPort?.postMessage(await fastSignState(message.state, message.privateKey));
    case 'UpdateChannel':
      return parentPort?.postMessage(await wallet._updateChannel(message.args));
    case 'PushMessage':
      return parentPort?.postMessage(await wallet._pushMessage(message.args));
  }
});
