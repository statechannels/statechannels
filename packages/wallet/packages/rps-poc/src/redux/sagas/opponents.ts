import { fork, take, cancel } from 'redux-saga/effects';
import { reduxSagaFirebase } from '../../gateways/firebase';

import { OpponentAction, OpponentActionType } from '../actions/opponents';

// { '0xabc': opponent1Data, ... } -> [opponent1Data, ....]
const opponentsTransformer = (dict) => Object.keys(dict.value).map((key) => dict.value[key]);

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
  while( yield take(OpponentActionType.SUBSCRIBE) ) {
    const opponentSyncer = yield fork(syncOpponentsSaga);

    yield take(OpponentActionType.UNSUBSCRIBE);

    yield cancel(opponentSyncer);
  }
}
