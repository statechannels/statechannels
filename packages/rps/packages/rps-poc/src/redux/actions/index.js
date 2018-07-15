import Enum from 'enum';

export const types = new Enum([
  'CHOOSE_OPPONENT',
  'CHOOSE_A_PLAY',
  'MESSAGE_RECEIVED',
  'EVENT_RECEIVED',
]);

export const chooseOpponent = (opponentAddress, stake) => ({
  type: types.CHOOSE_OPPONENT,
  opponentAddress,
  stake,
});

export const chooseAPlay = (aPlay) => ({
  type: types.CHOOSE_A_PLAY,
  aPlay,
});

export const messageReceived = (message) => ({
  type: types.MESSAGE_RECEIVED,
  message,
});

export const eventReceived = (event) => ({
  type: types.EVENT_RECEIVED,
  event,
});
