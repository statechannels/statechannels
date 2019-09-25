import * as selectors from '../selectors';
import { select, call, put } from 'redux-saga/effects';
import {
  getAdjudicatorHoldings,
  getProvider,
  getAdjudicatorOutcome,
} from '../../utils/contract-utils';
import { channelUpdate } from '../actions';
import { BigNumber, bigNumberify } from 'ethers/utils';

// A simple saga that runs and dispatches update actions to load the latest adjudicator state
export function* adjudicatorStateUpdater() {
  const channelIds = yield select(selectors.getChannelIds);
  const provider = yield call(getProvider);

  for (const channelId of channelIds) {
    const totalForChannel: BigNumber = yield call(getAdjudicatorHoldings, provider, channelId);

    const outcome = yield call(getAdjudicatorOutcome, provider, channelId);
    const isFinalized = bigNumberify(outcome.finalizedAt).gt('0x0');

    yield put(channelUpdate({ balance: totalForChannel.toHexString(), channelId, isFinalized }));
  }
}
