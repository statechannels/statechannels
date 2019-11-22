import { chain, ChannelState, Outcome, OutcomeItem, store } from '../../';
import { saveConfig } from '../../utils';

const PROTOCOL = 'direct-funding';
const success = { type: 'final' };
const failure = { type: 'final' };

interface Context {
  channelID: string;
  minimalOutcome: Outcome;
}

const sum = (a, b) => a + b;

function getHoldings(state: ChannelState, destination: string): number {
  const { outcome } = state;

  let currentFunding = chain.holdings(state.channelID);
  return outcome
    .filter(item => item.destination === destination)
    .map(item => {
      const payout = Math.min(currentFunding, item.amount);
      currentFunding -= payout;
      return payout;
    })
    .reduce(sum);
}

function assertOk(minimalOutcome: Outcome): boolean {
  return uniqueDestinations(minimalOutcome).length === minimalOutcome.length;
}

function obligation(
  state: ChannelState,
  minimalOutcome: Outcome,
  destination: string
): number {
  assertOk(minimalOutcome);
  const myHoldings = getHoldings(state, destination);

  const myTargetLevel = (
    minimalOutcome.find(item => item.destination === destination) || {
      amount: 0,
    }
  ).amount;
  return Math.max(myTargetLevel - myHoldings, 0);
}

function uniqueDestinations(outcome: Outcome): string[] {
  const firstEntry = (value, index, self) => {
    return self.indexOf(value) === index;
  };

  return outcome.map(i => i.destination).filter(firstEntry);
}

function preDepositOutcome(
  channelID: string,
  minimalOutcome: Outcome
): Outcome {
  const state = store.getLatestState(channelID);
  const { outcome } = state;

  const destinations = uniqueDestinations(outcome.concat(minimalOutcome));
  return outcome.concat(
    destinations.map(destination => ({
      destination,
      amount: obligation(state, minimalOutcome, destination),
    }))
  );
}

function amount(item: OutcomeItem): number {
  return item.amount;
}

function postDepositOutcome(channelID: string): Outcome {
  const { outcome } = store.getLatestState(channelID);
  const destinations = uniqueDestinations(outcome);

  return destinations.map(destination => ({
    destination,
    amount: outcome
      .filter(i => i.destination === destination)
      .map(amount)
      .reduce(sum),
  }));
}

interface Base {
  targetChannelID: string;
  minimalOutcome: Outcome;
}

type UpdateOutcome = Base & {
  targetOutcome: Outcome;
};

const updatePrefundOutcome = {
  invoke: {
    src: 'ledgerUpdate',
    data:
      'context => { return { targetChannelID: context.targetChannelID, targetOutcome: preDepositOutcome(context.targetChannelID, context.minimalOutcome), }; }',
    onDone: 'waiting',
  },
};

const waiting = {
  on: {
    '*': [
      { target: 'deposit', cond: 'safeToDeposit', actions: 'deposit' },
      { target: 'updatePostFundOutcome', cond: 'funded' },
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

const updatePostFundOutcome = {
  invoke: {
    src: 'ledgerUpdate',
    data:
      'context => ({ targetChannelID: context.targetChannelID, targetOutcome: postDepositOutcome(context.targetChannelID), })',
    onDone: 'success',
  },
};

const ledgerFundingConfig = {
  key: PROTOCOL,
  initial: 'updatePrefundOutcome',
  states: {
    updatePrefundOutcome,
    waiting,
    deposit,
    updatePostFundOutcome,
    success,
    failure,
  },
};

const guards = {
  safeToDeposit: 'x => true',
  funded: 'x => true',
};

const helpers = {
  preDepositOutcome: x => true,
  postDepositOutcome: x => true,
};

saveConfig(ledgerFundingConfig, { guards });
