import { Store } from '../..//store';
import { saveConfig } from '../..//utils';

const store = new Store();

const PROTOCOL = 'ledger-funding';
const success = { type: 'final' };
const failure = { type: 'final' };

const waitForChannel = {
  on: {
    '': {
      target: 'fundLedger',
      cond: 'suitableChannelExists',
      actions: 'assignExistingLedgerChannelID',
    },
  },
  invoke: {
    src: 'createChannel',
    // Really, you would pass more data to createChannel:
    data:
      'context => { const { outcome, participants } = store.get( context.targetChannelID).state; return { participants, outcome, }; }',
  },
  onDone: 'fundLedger',
  onError: 'failure',
};

const fundLedger = {
  invoke: {
    src: 'directFunding',
    data: `context => { return { channelID: context.ledgerChannelID, minimalOutcome: store.get(context.targetChannelID).state.outcome, }; }`,
    onDone: 'fundTarget',
    onError: 'failure',
  },
};

const fundTarget = {
  invoke: {
    src: 'ledgerUpdate',
    // This is a bit wrong: it should only allocate the necessary amount to context.targetChannelID
    data: `context => ({ channelID: context.ledgerChannelID, outcome: [context.targetChannelID, context.amount], })`,
    onDone: 'success',
    onError: 'failure',
  },
};

const ledgerFundingConfig = {
  key: PROTOCOL,
  initial: 'waitForChannel',
  states: {
    waitForChannel,
    fundLedger,
    fundTarget,
    success,
    failure,
  },
};

const guards = {
  suitableChannelExists: 'x => true',
};

saveConfig(ledgerFundingConfig, { guards });
