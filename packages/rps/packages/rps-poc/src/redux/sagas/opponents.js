import { fork, take, cancel } from 'redux-saga/effects';
import { reduxSagaFirebase } from '../../gateways/firebase';

import {
  types,
  syncOpponents,
} from '../actions/opponents';

const opponentsTransformer = ({ value }) => Object.keys(value).map(key => ({
  ...value[key],
  id: key
}));

function * syncOpponentsSaga () {
  yield fork(
    reduxSagaFirebase.database.sync,
    'opponents',
    {
      successActionCreator: syncOpponents,
      transform: opponentsTransformer,
    }
  );
}

export default function * opponentSaga () {
  while( yield take(types.OPPONENTS.SUBSCRIBE) ) {
    const opponentSyncer = yield fork(syncOpponentsSaga);

    yield take(types.OPPONENTS.UNSUBSCRIBE);

    yield cancel(opponentSyncer);
  }
}
