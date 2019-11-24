import { Outcome } from '../../';
import { saveConfig } from '../../utils';

const PROTOCOL = 'ledger-update';

interface CommonContext {
  channelID: string;
  currentTurnNumber: number;
  targetOutcome: Outcome;
}

const waiting = {
  entry: ['assignCurrentTurnNumber', 'sendVote'],
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

// PROTOCOL DEFINITION
const config = {
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

saveConfig(config, __dirname, { guards });
