import { GameEngine } from "../../game-engine/GameEngine";
import { State as GameState } from "../../game-engine/application-states";
import { Challenge } from "./reducer";
import BN from 'bn.js';

export const LOBBY_REQUEST = 'APPLICATION.LOBBY_REQUEST';
export const WAITING_ROOM_REQUEST = 'APPLICATION.WAITING_ROOM_REQUEST';
export const GAME_REQUEST = 'APPLICATION.GAME_REQUEST';
export const LOBBY_SUCCESS = 'APPLICATION.LOBBY_SUCCESS';
export const WAITING_ROOM_SUCCESS = 'APPLICATION.WAITING_ROOM_SUCCESS';
export const GAME_SUCCESS = 'APPLICATION.GAME_SUCCESS';

export const lobbyRequest = () => ({
  type: LOBBY_REQUEST as typeof LOBBY_REQUEST,
});

export const waitingRoomRequest = (name: string, stake: BN) => ({
  type: WAITING_ROOM_REQUEST as typeof WAITING_ROOM_REQUEST,
  name,
  stake,
});

export const gameRequest = (gameEngine: GameEngine) => ({
  type: GAME_REQUEST as typeof GAME_REQUEST,
  gameEngine,
});

export const lobbySuccess = () => ({
  type: LOBBY_SUCCESS as typeof LOBBY_SUCCESS,
});

export const waitingRoomSuccess = (challenge: Challenge) => ({
  type: WAITING_ROOM_SUCCESS as typeof WAITING_ROOM_SUCCESS,
  challenge,
});

export const gameSuccess = (state: GameState) => ({
  type: GAME_SUCCESS as typeof GAME_SUCCESS,
  state,
});


export type LobbyRequest = ReturnType<typeof lobbyRequest>;
export type WaitingRoomRequest = ReturnType<typeof waitingRoomRequest>;
export type GameRequest = ReturnType<typeof gameRequest>;

export type LobbySuccess = ReturnType<typeof lobbySuccess>;
export type WaitingRoomSuccess = ReturnType<typeof waitingRoomSuccess>;
export type GameSuccess = ReturnType<typeof gameSuccess>;

export type AnyAction = 
  | LobbyRequest
  | WaitingRoomRequest
  | GameRequest
  | LobbySuccess
  | WaitingRoomSuccess
  | GameSuccess;
