import { select, take, fork, actionChannel, cancel } from 'redux-saga/effects';

import { messageListener } from './message-listener';
import { messageSender } from './message-sender';
import { transactionSender } from './transaction-sender';
import { adjudicatorWatcher } from './adjudicator-watcher';
import { blockMiningWatcher } from './block-mining-watcher';

import { WalletState } from '../state';
import { getProvider, isDevelopmentNetwork } from '../../utils/contract-utils';

import { displaySender } from './display-sender';
import { ganacheMiner } from './ganache-miner';
import { WALLET_INITIALIZED } from '../state';

export function* sagaManager(): IterableIterator<any> {
  let adjudicatorWatcherProcess;
  let blockMiningWatcherProcess;
  let ganacheMinerProcess;

  // always want the message listenter to be running
  yield fork(messageListener);

  // todo: restrict just to wallet actions
  const channel = yield actionChannel('*');

  while (true) {
    yield take(channel);

    const state: WalletState = yield select((walletState: WalletState) => walletState);

    if (state.type === WALLET_INITIALIZED) {
      if (!adjudicatorWatcherProcess) {
        const provider = yield getProvider();
        adjudicatorWatcherProcess = yield fork(adjudicatorWatcher, provider);
      }
      // TODO: To cut down on block mined spam we could require processes to register/unregister when they want to listen for these events
      if (!blockMiningWatcherProcess) {
        blockMiningWatcherProcess = yield fork(blockMiningWatcher);
      }
      if (isDevelopmentNetwork() && !ganacheMinerProcess) {
        ganacheMinerProcess = yield fork(ganacheMiner);
      }
    } else {
      if (blockMiningWatcherProcess) {
        yield cancel(blockMiningWatcherProcess);
        blockMiningWatcherProcess = undefined;
      }
      if (ganacheMinerProcess) {
        yield cancel(ganacheMinerProcess);
        ganacheMinerProcess = undefined;
      }
      if (adjudicatorWatcherProcess) {
        yield cancel(adjudicatorWatcherProcess);
        adjudicatorWatcherProcess = undefined;
      }
    }

    const { outboxState } = state;
    if (outboxState.messageOutbox.length) {
      const messageToSend = outboxState.messageOutbox[0];
      yield messageSender(messageToSend);
    }
    if (outboxState.displayOutbox.length) {
      const displayMessageToSend = outboxState.displayOutbox[0];
      yield displaySender(displayMessageToSend);
    }
    if (outboxState.transactionOutbox.length) {
      const queuedTransaction = outboxState.transactionOutbox[0];
      yield transactionSender(queuedTransaction);
    }
  }
}
