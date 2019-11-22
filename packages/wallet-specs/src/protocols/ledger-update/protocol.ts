import { Outcome } from '../../';
import { saveConfig } from '../..//utils';

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
const newLedgerConfig = {
  key: PROTOCOL,
  initial: 'waiting',
  states: {
    waiting,
    success: { type: 'final' },
    failure: { type: 'final' },
  },
};

// CREATE VISUALS
const sampleContext = {
  channelID: '0xabc',
  currentTurnNumber: 7,
  goal: [],
};

const guards = {
  consensusReached: 'context => true',
  dissent: 'context => false',
};

const config = { ...newLedgerConfig, context: sampleContext };
saveConfig(config, { guards });
