export type ConcludingAction =
  | Cancelled
  | ConcludeSent
  | ConcludingImpossibleAcknowledged
  | ConcludeReceived
  | DefundChosen
  | DefundFailed
  | Defunded
  | Acknowledged;
export interface Cancelled {
  type: 'CONCLUDING.CANCELLED';
  processId: string;
}

export interface ConcludeSent {
  type: 'CONCLUDE.SENT';
  processId: string;
}

export interface ConcludingImpossibleAcknowledged {
  type: 'CONCLUDING.IMPOSSIBLE.ACKNOWLEDGED';
  processId: string;
}

export interface ConcludeReceived {
  type: 'CONCLUDE.RECEIVED';
  processId: string;
}

export interface DefundChosen {
  type: 'DEFUND.CHOSEN';
  processId: string;
}

export interface DefundFailed {
  type: 'DEFUND.FAILED';
  processId: string;
}

export interface Defunded {
  type: 'DEFUNDED';
  processId: string;
}

export interface Acknowledged {
  type: 'ACKNOWLEDGED';
  processId: string;
}

// --------
// Creators
// --------

export const cancelled = (processId: string): Cancelled => ({
  type: 'CONCLUDING.CANCELLED',
  processId,
});

export const concludeSent = (processId: string): ConcludeSent => ({
  type: 'CONCLUDE.SENT',
  processId,
});

export const resignationImpossibleAcknowledged = (
  processId: string,
): ConcludingImpossibleAcknowledged => ({
  type: 'CONCLUDING.IMPOSSIBLE.ACKNOWLEDGED',
  processId,
});

export const concludeReceived = (processId: string): ConcludeReceived => ({
  type: 'CONCLUDE.RECEIVED',
  processId,
});

export const defundChosen = (processId: string): DefundChosen => ({
  type: 'DEFUND.CHOSEN',
  processId,
});

export const defundFailed = (processId: string): DefundFailed => ({
  type: 'DEFUND.FAILED',
  processId,
});

export const defunded = (processId: string): Defunded => ({
  type: 'DEFUNDED',
  processId,
});

export const acknowledged = (processId: string): Acknowledged => ({
  type: 'ACKNOWLEDGED',
  processId,
});
