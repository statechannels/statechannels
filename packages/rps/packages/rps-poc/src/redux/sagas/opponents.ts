import { fork, take, cancel, takeEvery, call } from 'redux-saga/effects';
import { reduxSagaFirebase } from '../../gateways/firebase';

import { OpponentAction, OpponentActionType, CreateChallenge } from '../actions/opponents';

// { '0xabc': opponent1Data, ... } -> [opponent1Data, ....]
const opponentsTransformer = (dict) => Object.keys(dict.value).map((key) => dict.value[key]);

function * createChallenge(action: CreateChallenge) {
  const { challenge } = action;

  yield call(reduxSagaFirebase.database.create, `/players`, challenge);
}

function * syncOpponentsSaga () {
  yield fork(
    reduxSagaFirebase.database.sync,
    'players',
    {
      successActionCreator: OpponentAction.syncOpponents,
      transform: opponentsTransformer,
    },
    'value',
  );
}

export default function * opponentSaga () {
  yield takeEvery(OpponentActionType.CREATE_CHALLENGE, createChallenge)

  while( yield take(OpponentActionType.SUBSCRIBE) ) {
    const opponentSyncer = yield fork(syncOpponentsSaga);

    yield take(OpponentActionType.UNSUBSCRIBE);

    yield cancel(opponentSyncer);
  }
}
