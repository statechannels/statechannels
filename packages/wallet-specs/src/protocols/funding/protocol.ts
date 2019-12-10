import { assign, DoneInvokeEvent, Machine } from 'xstate';
import { LedgerFunding, VirtualHub } from '..';
import { failure, MachineFactory, Store, success } from '../..';
import { log } from '../../utils';
import { FundingStrategy, FundingStrategyProposed } from '../../wire-protocol';

const PROTOCOL = 'funding';

export interface Init {
  targetChannelId: string;
  tries: 0 | 1;
  clientChoice?: FundingStrategy;
  peerChoice?: FundingStrategy;
}

type ClientChoiceKnown = Init & {
  clientChoice: FundingStrategy;
};

const assignClientChoice = assign<ClientChoiceKnown>(
  (ctx: Init, { data: clientChoice }: DoneInvokeEvent<FundingStrategy>) => ({
    ...ctx,
    clientChoice,
  })
);
const getClientChoice = {
  invoke: {
    id: 'ask-client-for-choice',
    src: 'askClient',
    onDone: {
      target: 'wait',
      actions: ['sendClientChoice', assignClientChoice],
    },
  },
};

const wait = {
  on: {
    '': [
      { target: 'success', cond: 'consensus' },
      { target: 'retry', cond: 'disagreement' },
    ],
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
  (ctx: Init, { choice }: FundingStrategyProposed) => ({
    ...ctx,
    peerChoice: choice,
  })
);
const determineStrategy = {
  on: {
    FUNDING_STRATEGY_PROPOSED: {
      actions: assignPeerChoice,
    },
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

export const config = {
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
  directStrategyChosen(ctx: Init): boolean;
  indirectStrategyChosen(ctx: Init): boolean;
  virtualStrategyChosen(ctx: Init): boolean;
  maxTriesExceeded(ctx: Init): boolean;
};

export type Actions = {
  sendClientChoice: any;
  assignClientChoice: any;
  assignStrategy: any;
  assignProposal: any;
};

export type Services = {
  askClient(): Promise<FundingStrategy>;
  directFunding: any;
  virtualFunding: any;
  ledgerFunding: any;
};

export type Options = Partial<{
  guards: Guards;
  services: Services;
  actions: Actions;
}>;

const dummyGuard = x => {
  return true;
};
const guards: Guards = {
  consensus: ({ clientChoice, peerChoice }: Init) => {
    return !!clientChoice && clientChoice === peerChoice;
  },
  disagreement: ({ clientChoice, peerChoice }: Init) => {
    return clientChoice && peerChoice && clientChoice !== peerChoice;
  },
  directStrategyChosen: ({ clientChoice }: Init) => clientChoice === 'Direct',
  indirectStrategyChosen: ({ clientChoice }: Init) =>
    clientChoice === 'Indirect',
  virtualStrategyChosen: ({ clientChoice }: Init) => clientChoice === 'Virtual',
  maxTriesExceeded: dummyGuard,
};
export const mockOptions: Options = { guards };

export const machine: MachineFactory<Init, any> = (
  store: Store,
  context: Init
) => {
  function sendClientChoice({
    clientChoice,
    targetChannelId,
  }: ClientChoiceKnown) {
    store.sendStrategyChoice({
      type: 'FUNDING_STRATEGY_PROPOSED',
      choice: clientChoice,
      targetChannelId,
    });
  }

  const options: Options = {
    services: {
      askClient: async () => 'Indirect',
      directFunding: async () => true,
      ledgerFunding: LedgerFunding.machine(store).withContext(context),
      virtualFunding: async () => true,
    },
    guards,
    actions: {
      sendClientChoice,
      assignClientChoice,
      assignProposal: async () => true,
      assignStrategy: async () => true,
    },
  };

  return Machine(config, options).withContext(context);
};
