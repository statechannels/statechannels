import { Store } from './store';
import { saveConfig } from './utils';

const store = new Store();

const PROTOCOL = 'direct-funding';
const success = { type: 'final' };
const failure = { type: 'final' };

const arrangeOutcome = {
  invoke: {
    src: 'ledgerUpdate',
    // data: `context => context`, // This is a bit complicated
    onDone: 'waiting',
    // onError: 'failure', // This makes the diagram ugly
  },
};

const waiting = {
  on: {
    '*': [
      { target: 'deposit', cond: 'safeToDeposit', actions: 'deposit' },
      { target: 'postFundSetup', cond: 'funded' },
    ],
  },
};

const deposit = {
  invoke: {
    src: 'submitTransaction',
  },
  onDone: 'waiting',
  onError: 'failure',
};

const postFundSetup = {
  invoke: {
    src: 'advanceChannel',
    onDone: 'success',
    onError: 'failure',
  },
};

const ledgerFundingConfig = {
  key: PROTOCOL,
  initial: 'arrangeOutcome',
  states: {
    arrangeOutcome,
    waiting,
    deposit,
    postFundSetup,
    success,
    failure,
  },
};

const guards = {
  safeToDeposit: 'x => true',
  funded: 'x => true',
};

saveConfig(ledgerFundingConfig, { guards });
