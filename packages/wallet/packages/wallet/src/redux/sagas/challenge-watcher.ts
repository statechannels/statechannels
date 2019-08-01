import * as actions from '../actions';
import * as selectors from '../selectors';
import { take, select, put } from 'redux-saga/effects';
import { AdjudicatorState, getAdjudicatorChannelState } from '../adjudicator-state/state';
import { getProvider } from '../../utils/contract-utils';
import { eventChannel } from 'redux-saga';
import { ChannelSubscriber } from '../state';

export function* challengeWatcher() {
  const provider = yield getProvider();
  const blockMinedChannel = yield createBlockMinedEventChannel(provider);
  while (true) {
    const blockNumber = yield take(blockMinedChannel);
    const block = yield provider.getBlock(blockNumber);
    const adjudicatorState: AdjudicatorState = yield select(selectors.getAdjudicatorState);

    for (const channelId of Object.keys(adjudicatorState)) {
      if (challengeIsExpired(adjudicatorState, channelId, block.timestamp)) {
        const subscribers: ChannelSubscriber[] = yield select(
          selectors.getAdjudicatorWatcherSubscribersForChannel,
          channelId,
        );
        for (const subscriber of subscribers) {
          const { processId, protocolLocator } = subscriber;
          yield put(
            actions.challengeExpiredEvent({
              processId,
              protocolLocator,
              channelId,
              timestamp: block.timestamp,
            }),
          );
        }
      }
    }
  }
}

function* createBlockMinedEventChannel(provider) {
  return eventChannel(emit => {
    provider.on('block', blockNumber => {
      emit(blockNumber);
    });

    return () => {
      provider.removeAllListeners('block');
    };
  });
}

function challengeIsExpired(state: AdjudicatorState, channelId: string, blockTimestamp: number) {
  const channelState = getAdjudicatorChannelState(state, channelId);
  if (!channelState) {
    return false;
  }
  return channelState.challenge && channelState.challenge.expiresAt <= blockTimestamp * 1000;
}
