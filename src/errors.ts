const CHANNEL_EXISTS = new Error(
  'Attempting to open a channel that already exists -- use a different nonce'
);
const CHANNEL_MISSING = new Error('Channel does not exist');
const STATE_NOT_SIGNED = new Error('State not signed by mover');
const INVALID_TRANSITION = new Error('Invalid transition');
const INVALID_STATE_UNKNOWN_REASON = new Error('State is not valid, but th reason is not known');
const NOT_OUR_TURN = new Error('Not our turn to create a state');
const VALUE_LOST = new Error('Value not preserved');

export default {
  CHANNEL_EXISTS,
  STATE_NOT_SIGNED,
  CHANNEL_MISSING,
  INVALID_TRANSITION,
  INVALID_STATE_UNKNOWN_REASON,
  NOT_OUR_TURN,
  VALUE_LOST
};
