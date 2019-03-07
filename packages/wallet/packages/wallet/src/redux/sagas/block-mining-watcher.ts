import { getProvider } from '../../utils/contract-utils';
import { eventChannel } from 'redux-saga';
import { take, put } from 'redux-saga/effects';
import { blockMined } from '../actions';

export function* blockMiningWatcher() {
  const provider = yield getProvider();
  const blockchainEventChannel = eventChannel(emit => {
    provider.on('block', blockNumber => {
      emit(blockNumber);
    });

    return () => {
      provider.removeAllListeners('block');
    };
  });

  while (true) {
    const blockNumber = yield take(blockchainEventChannel);
    const block = yield provider.getBlock(blockNumber);
    yield put(blockMined(block));
  }
}
