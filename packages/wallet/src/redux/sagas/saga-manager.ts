import {actionChannel, cancel, fork, select, take, put} from "redux-saga/effects";

import {Web3Provider} from "ethers/providers";

import {getProvider, isDevelopmentNetwork} from "../../utils/contract-utils";

import {WalletState} from "../state";

import {WALLET_INITIALIZED} from "../state";

import {isLoadAction, messageSent} from "../actions";

import {USE_STORAGE} from "../../constants";

import {adjudicatorWatcher} from "./adjudicator-watcher";
import {challengeWatcher} from "./challenge-watcher";
import {transactionSender} from "./transaction-sender";

import {challengeResponseInitiator} from "./challenge-response-initiator";
import {ganacheMiner} from "./ganache-miner";
import {displaySender} from "./messaging/display-sender";
import {multipleActionDispatcher} from "./multiple-action-dispatcher";

import {adjudicatorStateUpdater} from "./adjudicator-state-updater";
import {assetHolderStateUpdater} from "./asset-holder-state-updater";
import {assetHoldersWatcher} from "./asset-holder-watcher";
import {messageSender} from "./messaging/message-sender";
import {OutgoingApiAction} from "./messaging/outgoing-api-actions";
import {postMessageListener} from "./messaging/post-message-listener";

export function* sagaManager(): IterableIterator<any> {
  // If we are using storage we want to wait until storage is loaded before handling anything
  if (USE_STORAGE) {
    yield take("REDUX_STORAGE_LOAD");
  }

  let adjudicatorWatcherProcess;
  let ETHAssetHolderWatcherProcess;
  let challengeWatcherProcess;
  let ganacheMinerProcess;
  let challengeResponseInitiatorProcess;

  yield fork(multipleActionDispatcher);

  // always want the message listener to be running
  yield fork(postMessageListener);

  // todo: restrict just to wallet actions
  const channel = yield actionChannel("*");

  while (true) {
    const action = yield take(channel);

    // If it is a load action we update the adjudicator state with the latest on chain info
    if (isLoadAction(action)) {
      yield fork(adjudicatorStateUpdater);
      yield fork(assetHolderStateUpdater);
    }

    // @ts-ignore TODO: Why is redux-saga select think its returning undefined?
    const state: WalletState = yield select((walletState: WalletState) => walletState);

    // @ts-ignore TODO: Why is redux-saga select think its returning undefined?
    const provider: Web3Provider = yield getProvider();

    if (state.type === WALLET_INITIALIZED) {
      if (!adjudicatorWatcherProcess) {
        adjudicatorWatcherProcess = yield fork(adjudicatorWatcher, provider);
      }
      if (!ETHAssetHolderWatcherProcess) {
        ETHAssetHolderWatcherProcess = yield fork(assetHoldersWatcher, provider);
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
      if (ETHAssetHolderWatcherProcess) {
        yield cancel(ETHAssetHolderWatcherProcess);
        ETHAssetHolderWatcherProcess = undefined;
      }
      if (challengeResponseInitiatorProcess) {
        yield cancel(challengeResponseInitiatorProcess);
        challengeResponseInitiatorProcess = undefined;
      }
    }

    const {outboxState} = state;
    if (outboxState.messageOutbox.length) {
      const messageToSend = outboxState.messageOutbox[0] as OutgoingApiAction;
      yield messageSender(messageToSend);
      yield put(messageSent({}));
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
