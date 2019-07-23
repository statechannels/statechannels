import { select, take, fork, actionChannel, cancel } from 'redux-saga/effects';

import { messageListener } from './message-listener';
import { messageSender } from './message-sender';
import { transactionSender } from './transaction-sender';
import { adjudicatorWatcher } from './adjudicator-watcher';
import { challengeWatcher } from './challenge-watcher';

import { WalletState } from '../state';
import { getProvider, isDevelopmentNetwork } from '../../utils/contract-utils';

import { displaySender } from './display-sender';
import { ganacheMiner } from './ganache-miner';
import { WALLET_INITIALIZED } from '../state';
import { challengeResponseInitiator } from './challenge-response-initiator';
import { multipleActionDispatcher } from './multiple-action-dispatcher';

import { adjudicatorStateUpdater } from './adjudicator-state-updater';
import { isLoadAction } from '../actions';

export function* sagaManager(): IterableIterator<any> {
  let adjudicatorWatcherProcess;
  let challengeWatcherProcess;
  let ganacheMinerProcess;
  let challengeResponseInitiatorProcess;

  yield fork(multipleActionDispatcher);

  // always want the message listenter to be running
  yield fork(messageListener);

  // todo: restrict just to wallet actions
  const channel = yield actionChannel('*');

  while (true) {
    const action = yield take(channel);
    // If it is a load action we update the adjudicator state with the latest on chain info
    if (isLoadAction(action)) {
      yield fork(adjudicatorStateUpdater);
    }

    const state: WalletState = yield select((walletState: WalletState) => walletState);

    if (state.type === WALLET_INITIALIZED) {
      if (!adjudicatorWatcherProcess) {
        const provider = yield getProvider();
        adjudicatorWatcherProcess = yield fork(adjudicatorWatcher, provider);
      }
      // TODO: To cut down on block mined spam we could require processes to register/unregister when they want to listen for these events
      if (!challengeWatcherProcess) {
        challengeWatcherProcess = yield fork(challengeWatcher);
      }
      if (isDevelopmentNetwork() && !ganacheMinerProcess) {
        ganacheMinerProcess = yield fork(ganacheMiner);
      }
      if (!challengeResponseInitiatorProcess) {
        challengeResponseInitiatorProcess = yield fork(challengeResponseInitiator);
      }
    } else {
      if (challengeWatcherProcess) {
        yield cancel(challengeWatcherProcess);
        challengeWatcherProcess = undefined;
      }
      if (ganacheMinerProcess) {
        yield cancel(ganacheMinerProcess);
        ganacheMinerProcess = undefined;
      }
      if (adjudicatorWatcherProcess) {
        yield cancel(adjudicatorWatcherProcess);
        adjudicatorWatcherProcess = undefined;
      }
      if (challengeResponseInitiatorProcess) {
        yield cancel(challengeResponseInitiatorProcess);
        challengeResponseInitiatorProcess = undefined;
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
