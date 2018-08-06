export const types = {
  OPPONENTS: {
    SYNC: 'OPPONENTS.SYNC',
    SUBSCRIBE: 'OPPONENTS.SUBSCRIBE',
    UNSUBSCRIBE: 'OPPONENTS.UNSUBSCRIBE',
  }
};

export const syncOpponents = (opponents: string[]) => ({
  type: types.OPPONENTS.SYNC,
  opponents
});

export const subscribeOpponents = () => ({
  type: types.OPPONENTS.SUBSCRIBE,
});

export const unsubscribeOpponents = () => ({
  type: types.OPPONENTS.UNSUBSCRIBE,
});