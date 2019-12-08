import { Outcome } from '../../';

const PROTOCOL = 'ledger-update';

export interface Init {
  channelID: string;
  targetOutcome: Outcome;
}

const waiting = {
  entry: ['assignCurrentturnNum', 'sendVote'],
  on: {
    '*': [
      {
        target: 'success',
        cond: 'consensusReached',
      },
      {
        target: 'failure',
        cond: 'dissent',
      },
    ],
  },
};

export const config = {
  key: PROTOCOL,
  initial: 'waiting',
  states: {
    waiting,
    success: { type: 'final' },
    failure: { type: 'final' },
  },
};

// CREATE VISUALS
const guards = {
  consensusReached: context => true,
  dissent: context => false,
};
export const mockOptions = { guards };
