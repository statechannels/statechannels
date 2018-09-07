import { Reducer } from 'redux';
import * as applicationActions from './actions';
import * as gameActions from '../game/actions';
import * as lobbyActions from '../lobby/actions';

import { State as GameState } from '../../game-engine/application-states';

export enum Room {
  lobby = 'ROOM.LOBBY',
  waitingRoom = 'ROOM.WAITING_ROOM',
  game = 'ROOM.GAME',
};

export interface Challenge {
  address: string,
  name: string,
  stake: number,
  isPublic: boolean,
  lastSeen: number,
};

export interface ApplicationState {
  currentRoom: Room,
  gameState?: GameState,
  challenges?: Challenge[],
  myChallenge?: Challenge,
}

const initialState = {
  currentRoom: Room.lobby,
  challenges: [],
};

type StateAction =
  | applicationActions.LobbySuccess
  | applicationActions.WaitingRoomSuccess
  | applicationActions.GameSuccess
  | gameActions.StateChanged
  | lobbyActions.SyncChallenge

export const applicationReducer: Reducer<ApplicationState> = (state = initialState, action: StateAction) => {
  switch (action.type) {
    case applicationActions.LOBBY_SUCCESS:
      return initialState;
    case applicationActions.WAITING_ROOM_SUCCESS:
      return {
        currentRoom: Room.waitingRoom,
        myChallenge: action.challenge,
      };
    case applicationActions.GAME_SUCCESS:
      return {
        currentRoom: Room.game,
        gameState: action.state,
      };
    case gameActions.STATE_CHANGED:
      return {
        ...state,
        gameState: action.state,
      };
    case lobbyActions.SYNC_CHALLENGES:
      return {
        ...state,
        challenges: action.challenges,
      };
    default:
      return state;
  }
}
