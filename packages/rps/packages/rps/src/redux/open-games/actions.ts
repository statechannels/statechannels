import { OpenGame } from "./state";

export const SYNC_OPEN_GAMES = 'OPEN_GAMES.SYNC_OPEN_GAMES';

export const syncOpenGames = (openGames: OpenGame[]) => ({
  type: SYNC_OPEN_GAMES as typeof SYNC_OPEN_GAMES,
  openGames,
});

export type SyncOpenGames = ReturnType<typeof syncOpenGames>;
