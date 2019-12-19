import { Outcome } from '../../';

const PROTOCOL = 'ledger-update';

export interface Init {
  channelId: string;
  targetOutcome: Outcome;
}

const waiting = {
  entry: ['assignCurrentturnNum', 'sendVote'],
  on: {
    '*': [
      {
        target: 'success',
        cond: 'consensusReached'
      },
      {
        target: 'failure',
        cond: 'dissent'
      }
    ]
  }
};

export const config = {
  key: PROTOCOL,
  initial: 'waiting',
  states: {
    waiting,
    success: { type: 'final' },
    failure: { type: 'final' }
  }
};

// CREATE VISUALS
const guards = {
  consensusReached: () => true,
  dissent: () => false
};
export const mockOptions = { guards };
