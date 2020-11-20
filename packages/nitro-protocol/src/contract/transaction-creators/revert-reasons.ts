// Generic messages
export const CHANNEL_FINALIZED = 'Channel finalized.';
export const CHANNEL_NOT_FINALIZED = 'Channel not finalized.';
export const CHANNEL_NOT_OPEN = 'Channel not open.';
export const INVALID_SIGNATURES = 'Invalid signatures';
export const NO_ONGOING_CHALLENGE = 'No ongoing challenge.';
export const TURN_NUM_RECORD_DECREASED = 'turnNumRecord decreased.';
export const TURN_NUM_RECORD_NOT_INCREASED = 'turnNumRecord not increased.';
export const UNACCEPTABLE_WHO_SIGNED_WHAT = 'Unacceptable whoSignedWhat array';
export const WHO_SIGNED_WHAT_WRONG_LENGTH =
  '_validSignatures: whoSignedWhat must be the same length as participants';
export const WRONG_CHANNEL_STORAGE = 'Channel storage does not match stored version.';
export const INVALID_SIGNATURE = 'Invalid signature';

// Function-specific messages
export const CHALLENGER_NON_PARTICIPANT = 'Challenger is not a participant';
export const RESPONSE_UNAUTHORIZED = 'Response not signed by authorized mover';
export const WRONG_REFUTATION_SIGNATURE = 'Refutation state not signed by challenger';
