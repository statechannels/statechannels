import { select, take, fork, actionChannel, cancel } from 'redux-saga/effects';

import { messageListener } from './message-listener';
import { messageSender } from './message-sender';
import { transactionSender } from './transaction-sender';
import { adjudicatorWatcher } from './adjudicator-watcher';
import { blockMiningWatcher } from './block-mining-watcher';

import { WalletState, WAIT_FOR_ADJUDICATOR } from '../state';
import { getProvider } from '../../utils/contract-utils';

import { displaySender } from './display-sender';
import { ganacheMiner } from './ganache-miner';
import { adjudicatorLoader } from './adjudicator-loader';
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

    // if we don't have an adjudicator, make sure that the adjudicatorLoader runs once
    // todo: can we be sure that this won't be called more than once if successful?
    if (state.type === WAIT_FOR_ADJUDICATOR) {
      yield adjudicatorLoader();
    }

    // if have adjudicator, make sure that the adjudicator watcher is running
    if (state.type === WALLET_INITIALIZED) {
      if (state.channelState && 'activeAppChannelId' in state.channelState) {
        if (!adjudicatorWatcherProcess) {
          const provider = yield getProvider();
          adjudicatorWatcherProcess = yield fork(
            adjudicatorWatcher,
            state.channelState.activeAppChannelId,
            provider,
          );
        }
      } else {
        if (adjudicatorWatcherProcess) {
          yield cancel(adjudicatorWatcherProcess);
          adjudicatorWatcherProcess = undefined;
        }
      }

      // We only watch for mined blocks when { waiting } for a challenge expiry {
      const appChannel =
        state.channelState && state.channelState.activeAppChannelId
          ? state.channelState.initializedChannels[state.channelState.activeAppChannelId]
          : undefined;

      if (appChannel && 'challengeExpiry' in appChannel) {
        if (!blockMiningWatcherProcess) {
          blockMiningWatcherProcess = yield fork(blockMiningWatcher);
        }
        if (process.env.TARGET_NETWORK === 'development' && !ganacheMinerProcess) {
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
      const { transactionRequest, channelId } = outboxState.transactionOutbox[0];
      yield transactionSender(transactionRequest, channelId);
    }
  }
}
