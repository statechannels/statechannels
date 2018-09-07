import { fork } from 'redux-saga/effects';
import opponentSaga from './opponents';
import loginSaga from './login';
import messageSaga from './messages';
import autoOpponentSaga from './auto-opponent';



export default function* rootSaga() {
  yield fork(opponentSaga);
  yield fork(loginSaga);
  yield fork(messageSaga);  
  yield fork(autoOpponentSaga);
}
