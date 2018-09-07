export const CANCEL_CHALLENGE = 'WAITING_ROOM.CANCEL_CHALLENGE';

export const cancelChallenge = () => ({
  type: CANCEL_CHALLENGE as typeof CANCEL_CHALLENGE,
});

export type CancelChallenge = ReturnType<typeof cancelChallenge>;
