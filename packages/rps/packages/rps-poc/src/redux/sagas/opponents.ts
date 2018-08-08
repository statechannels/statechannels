import { fork, take, cancel } from 'redux-saga/effects';
import { reduxSagaFirebase } from '../../gateways/firebase';

import { OpponentAction, OpponentActionType } from '../actions/opponents';

const opponentsTransformer = (value: object) => Object.keys(value).map(key => ({
  ...value[key],
  id: key
}));


function * syncOpponentsSaga () {
  yield fork(
    reduxSagaFirebase.database.sync,
    'opponents',
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
