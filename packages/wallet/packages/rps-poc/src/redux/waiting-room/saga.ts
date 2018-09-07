import { take, actionChannel, put, call } from 'redux-saga/effects'; 
import { reduxSagaFirebase } from '../../gateways/firebase';
 
import * as waitingRoomActions from '../waiting-room/actions';
import * as messageActions from '../message-service/actions';
import * as applicationActions from '../application/actions';
import GameEngineB from '../../game-engine/GameEngineB';
import decode from '../../game-engine/positions/decode';

type ActionType = (
  | waitingRoomActions.CancelChallenge
  | messageActions.MessageReceived
);

export default function * waitingRoomSaga(address: string, name: string, stake: number, isPublic: boolean) {

  const channel = yield actionChannel([
    waitingRoomActions.CANCEL_CHALLENGE,
    messageActions.MESSAGE_RECEIVED,
  ]);

  const challenge = {
    address,
    name,
    stake,
    isPublic,
    lastSeen: new Date().getTime(),
  }

  yield put(applicationActions.waitingRoomSuccess(challenge));
  // use update to allow us to pick our own key
  yield call(reduxSagaFirebase.database.update, `/challenges/${address}`, challenge);

  while (true) {
    const action: ActionType = yield take(channel);

    switch (action.type) {
      case waitingRoomActions.CANCEL_CHALLENGE:
        yield call(reduxSagaFirebase.database.delete, `/challenges/${address}`);
        yield put(applicationActions.lobbyRequest());
        break;

      case messageActions.MESSAGE_RECEIVED:
        const position = decode(action.message);
        const gameEngine = GameEngineB.fromProposal(position);
        // todo: handle error if it isn't a propose state with the right properties
        yield call(reduxSagaFirebase.database.delete, `/challenges/${address}`);
        yield put(applicationActions.gameRequest(gameEngine));
        break;
    }
  }
}


