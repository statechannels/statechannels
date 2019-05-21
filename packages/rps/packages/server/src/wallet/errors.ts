const CHANNEL_EXISTS = new Error(
  'Attempting to open a channel that already exists -- use a different nonce',
);
const CHANNEL_MISSING = new Error('Channel does not exist');
const COMMITMENT_NOT_SIGNED = new Error('Commitment not signed by mover');
const INVALID_TRANSITION = new Error('Invalid transition');
const VALUE_LOST = new Error('Value not preserved');
const processMissing = (processId: string) => new Error(`Process ${processId} not running`);
const processRunning = (processId: string) => new Error(`Process ${processId} already running`);

export default {
  CHANNEL_EXISTS,
  COMMITMENT_NOT_SIGNED,
  CHANNEL_MISSING,
  INVALID_TRANSITION,
  VALUE_LOST,
  processMissing,
  processRunning,
};
