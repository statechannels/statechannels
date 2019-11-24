import { saveConfig } from '../../utils';

const success = { type: 'final' };
const failure = { type: 'final' };
const PROTOCOL = 'funding';

interface Init {
  targetChannelID: string;
  tries: 0 | 1;
}

const getClientChoice = {
  invoke: {
    id: 'ask-client-for-choice',
    src: 'askClient',
    onDone: {
      actions: ['sendClientChoice', 'assignClientChoice'],
    },
  },
  onDone: 'wait',
};

const wait = {
  on: {
    '*': [
      {
        target: 'success',
        cond: 'consensus',
        actions: 'assignStrategy',
      },
      { target: 'retry', cond: 'disagreement' },
    ],
  },
};

const retry = {
  entry: 'incrementTries',
  on: {
    '': [
      { target: 'failure', cond: 'maxTriesExceeded' },
      { target: 'getClientChoice' },
    ],
  },
};

const determineStrategy = {
  on: {
    PROPOSAL_RECEIVED: { actions: 'assignProposal' },
  },
  initial: 'getClientChoice',
  states: {
    getClientChoice,
    wait,
    success,
    retry,
    failure,
  },
  onDone: [
    { target: 'fundDirectly', cond: 'directStrategyChosen' },
    { target: 'fundIndirectly', cond: 'indirectStrategyChosen' },
    { target: 'fundVirtually', cond: 'virtualStrategyChosen' },
  ],
};

const fundDirectly = { invoke: 'directFunding', onDone: 'success' };
const fundVirtually = { invoke: 'virtualFunding', onDone: 'success' };
const fundIndirectly = { invoke: 'ledgerFunding', onDone: 'success' };

const config = {
  key: PROTOCOL,
  initial: 'determineStrategy',
  states: {
    determineStrategy,
    fundDirectly,
    fundIndirectly,
    fundVirtually,
    success,
    failure,
  },
};

const dummyGuard = 'x => true';
const guards = {
  consensus: dummyGuard,
  disagreement: dummyGuard,
  directStrategyChosen: dummyGuard,
  indirectStrategyChosen: dummyGuard,
  virtualStrategyChosen: dummyGuard,
  maxTriesExceeded: dummyGuard,
};

saveConfig(config, { guards });
