export const ACCEPT_CHALLENGE = 'LOBBY.ACCEPT_CHALLENGE';
export const CREATE_CHALLENGE = 'LOBBY.CREATE_CHALLENGE';
export const SYNC_CHALLENGES = 'LOBBY.SYNC_CHALLENGES';

export const acceptChallenge = (address: string, stake: number) => ({
  type: ACCEPT_CHALLENGE as typeof ACCEPT_CHALLENGE,
  address,
  stake,
});

export const createChallenge = (name: string, stake: number) => ({
  type: CREATE_CHALLENGE as typeof CREATE_CHALLENGE,
  name,
  stake,
});

export const syncChallenges = (challenges: any[]) => ({
  type: SYNC_CHALLENGES as typeof SYNC_CHALLENGES,
  challenges,
});

export type AcceptChallenge = ReturnType<typeof acceptChallenge>;
export type CreateChallenge = ReturnType<typeof createChallenge>;
export type SyncChallenge = ReturnType<typeof syncChallenges>;

export type AnyAction = AcceptChallenge | CreateChallenge | SyncChallenge;
