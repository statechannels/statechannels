import { store } from '../../store';
import { saveConfig } from '../../utils';

const PROTOCOL = 'ledger-funding';
const success = { type: 'final' };

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
      'context => { const { outcome, participants } = store.getLatestState( context.targetChannelID); return { participants, outcome }; }',
  },
  onDone: 'fundLedger',
};

const fundLedger = {
  invoke: {
    src: 'directFunding',
    data:
      'context => { return { channelID: context.ledgerChannelID, minimalOutcome: store.getLatestState(context.targetChannelID).outcome, }; }',
    onDone: 'fundTarget',
  },
};

const fundTarget = {
  invoke: {
    src: 'ledgerUpdate',
    // This is a bit wrong: it should only allocate the necessary amount to context.targetChannelID
    data:
      'context => ({ channelID: context.ledgerChannelID, outcome: [context.targetChannelID, context.amount], })',
    onDone: 'success',
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
  },
};

const guards = {
  suitableChannelExists: 'x => true',
};

saveConfig(ledgerFundingConfig, { guards });
