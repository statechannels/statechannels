import {
  add,
  Allocation,
  AllocationItem,
  chain,
  getChannelID,
  max,
  Outcome,
  State,
  store,
  subtract,
} from '../../';
import { isAllocation, shouldBe } from '../../store';
import { saveConfig } from '../../utils';

const PROTOCOL = 'direct-funding';
const success = { type: 'final' };
const failure = { type: 'final' };

export interface Init {
  channelID: string;
  minimalOutcome: Outcome;
}

function getHoldings(state: State, destination: string): string {
  const { outcome } = state;

  let currentFunding = chain.holdings(getChannelID(state.channel));
  return shouldBe(isAllocation, outcome)
    .filter(item => item.destination === destination)
    .map(item => {
      const payout = Math.min(currentFunding, Number(item.amount));
      currentFunding -= payout;
      return payout.toString();
    })
    .reduce(add);
}

function assertOk(minimalOutcome: Allocation): boolean {
  return uniqueDestinations(minimalOutcome).length === minimalOutcome.length;
}

function obligation(
  state: State,
  minimalOutcome: Allocation,
  destination: string
): string {
  assertOk(minimalOutcome);
  const myHoldings = getHoldings(state, destination);

  const myTargetLevel = (
    minimalOutcome.find(item => item.destination === destination) || {
      amount: '0',
    }
  ).amount;
  return max(subtract(myTargetLevel, myHoldings), 0);
}

function uniqueDestinations(outcome: Allocation): string[] {
  const firstEntry = (value, index, self) => {
    return self.indexOf(value) === index;
  };

  return outcome.map(i => i.destination).filter(firstEntry);
}

function preDepositOutcome(
  channelID: string,
  minimalOutcome: Allocation
): Outcome {
  const { state } = store.getLatestConsensus(channelID);
  const outcome = store.getLatestSupportedAllocation(channelID);

  const destinations = uniqueDestinations(outcome.concat(minimalOutcome));
  return outcome.concat(
    destinations.map(destination => ({
      destination,
      amount: obligation(state, minimalOutcome, destination),
    }))
  );
}

function amount(item: AllocationItem): string {
  return item.amount;
}

function postDepositOutcome(channelID: string): Outcome {
  const outcome = store.getLatestSupportedAllocation(channelID);
  const destinations = uniqueDestinations(outcome);

  return destinations.map(destination => ({
    destination,
    amount: outcome
      .filter(i => i.destination === destination)
      .map(amount)
      .reduce(add),
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
    data: context => {
      return {
        targetChannelID: context.targetChannelID,
        targetOutcome: preDepositOutcome(
          context.targetChannelID,
          context.minimalOutcome
        ),
      };
    },
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
    data: context => ({
      targetChannelID: context.targetChannelID,
      targetOutcome: postDepositOutcome(context.targetChannelID),
    }),
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
  safeToDeposit: x => true,
  funded: x => true,
};

const helpers = {
  preDepositOutcome: x => true,
  postDepositOutcome: x => true,
};

saveConfig(ledgerFundingConfig, __dirname, { guards });
