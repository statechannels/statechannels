import { saveConfig } from '../..//utils';

const success = { type: 'final' };
const failure = { type: 'final' };
const PROTOCOL = 'funding';

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

const useStrategy = {
  on: {
    '': [
      { target: 'fundDirectly', cond: 'directStrategyChosen' },
      { target: 'fundIndirectly', cond: 'indirectStrategyChosen' },
      { target: 'fundVirtually', cond: 'virtualStrategyChosen' },
    ],
  },
};

const fundDirectly = { invoke: 'directFunding', onDone: 'success' };
const fundVirtually = { invoke: 'virtualFunding', onDone: 'success' };
const fundIndirectly = { invoke: 'ledgerFunding', onDone: 'success' };

// PROTOCOL DEFINITION
const fundingConfig = {
  key: PROTOCOL,
  initial: 'determineStrategy',
  states: {
    determineStrategy,
    // useStrategy,
    fundDirectly,
    fundIndirectly,
    fundVirtually,
    success,
    failure,
  },
};

// CREATE VISUALS
const sampleContext = {
  targetChannelId: '0xabc',
  round: 0,
  opponentAddress: 'you',
  ourAddress: 'me',
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

const config = { ...fundingConfig, context: sampleContext };
saveConfig(config, { guards });

export default config;
