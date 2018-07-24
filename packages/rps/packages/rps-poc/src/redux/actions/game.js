export const types = Object.freeze({
  CHOOSE_OPPONENT: "CHOOSE_OPPONENT",
  CHOOSE_A_PLAY: "CHOOSE_A_PLAY",
  MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
  EVENT_RECEIVED: "EVENT_RECEIVED",
  MESSAGE_SENT: "MESSAGE_SENT",
});

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

export const messageSent = (message) => ({
  type: types.MESSAGE_SENT,
  message,
});

export const eventReceived = (event) => ({
  type: types.EVENT_RECEIVED,
  event,
});
