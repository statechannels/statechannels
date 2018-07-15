export const types = {
  CHOOSE_OPPONENT: "CHOOSE_OPPONENT",
  CHOOSE_A_PLAY: "CHOOSE_A_PLAY",
  MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
  EVENT_RECEIVED: "EVENT_RECEIVED",
  TRIGGER_FAKE_OPPONENT_RESPONSE: "TRIGGER_FAKE_OPPONENT_RESPONSE",
  TRIGGER_FAKE_BLOCKCHAIN_RESPONSE: "TRIGGER_FAKE_BLOCKCHAIN_RESPONSE",
};

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

// These are just for development purposes.
export const triggerFakeBlockchainResponse = () => ({
  type: types.TRIGGER_FAKE_BLOCKCHAIN_RESPONSE
});

export const triggerFakeOpponentResponse = () => ({
  type: types.TRIGGER_FAKE_OPPONENT_RESPONSE
});