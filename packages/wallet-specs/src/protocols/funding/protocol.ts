import { assign, DoneInvokeEvent, Machine } from 'xstate';
import { failure, Store, success } from '../..';
import { saveConfig } from '../../utils';
import { FundingStrategy, FundingStrategyProposed } from '../../wire-protocol';

const PROTOCOL = 'funding';

export interface Init {
  targetChannelID: string;
  tries: 0 | 1;
  clientChoice?: FundingStrategy;
  peerChoice?: FundingStrategy;
}

type ClientChoiceKnown = Init & {
  clientChoice: FundingStrategy;
};

const assignClientChoice = assign<ClientChoiceKnown>(
  (ctx: Init, { data }: DoneInvokeEvent<FundingStrategyProposed>) => ({
    ...ctx,
    clientChoice: data.choice,
  })
);
const getClientChoice = {
  invoke: {
    id: 'ask-client-for-choice',
    src: 'askClient',
    onDone: {
      actions: ['sendClientChoice', assignClientChoice],
    },
  },
  onDone: 'wait',
};

const wait = {
  on: {
    '*': [
      { target: 'success', cond: 'consensus' },
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

type PeerChoiceKnown = Init & { peerChoice: FundingStrategy };
const assignPeerChoice = assign<PeerChoiceKnown>(
  (ctx: Init, { data }: DoneInvokeEvent<FundingStrategyProposed>) => ({
    ...ctx,
    peerChoice: data.choice,
  })
);
const determineStrategy = {
  on: {
    PROPOSAL_RECEIVED: { actions: assignPeerChoice },
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

const fundDirectly = {
  invoke: {
    src: 'directFunding',
    onDone: 'success',
  },
};
const fundVirtually = {
  invoke: {
    src: 'virtualFunding',
    onDone: 'success',
  },
};
const fundIndirectly = {
  invoke: {
    src: 'ledgerFunding',
    onDone: 'success',
  },
};

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
export type Guards = {
  consensus: any;
  disagreement: any;
  directStrategyChosen: any;
  indirectStrategyChosen: any;
  virtualStrategyChosen: any;
  maxTriesExceeded: any;
};

export type Actions = {
  sendClientChoice: any;
  assignClientChoice: any;
  assignStrategy: any;
  assignProposal: any;
};

export type Services = {
  askClient: any;
  directFunding: any;
  virtualFunding: any;
  ledgerFunding: any;
};

export type Options = Partial<{
  guards: Guards;
  services: Services;
  actions: Actions;
}>;

const dummyGuard = x => true;
const guards: Guards = {
  consensus: dummyGuard,
  disagreement: dummyGuard,
  directStrategyChosen: dummyGuard,
  indirectStrategyChosen: dummyGuard,
  virtualStrategyChosen: dummyGuard,
  maxTriesExceeded: dummyGuard,
};

export function machine(store: Store, context: Init) {
  const options: Options = {
    services: {
      askClient: async () => true,
      directFunding: async () => true,
      ledgerFunding: async () => true,
      virtualFunding: async () => true,
    },
    guards,
    actions: {
      sendClientChoice: async () => true,
      assignClientChoice: async () => true,
      assignProposal: async () => true,
      assignStrategy: async () => true,
    },
  };
  return Machine(config, options).withContext(context);
}

{
  saveConfig(config, __dirname, { guards });
}
