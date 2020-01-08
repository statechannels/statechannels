import {
  add,
  chain,
  getChannelId,
  max,
  store,
  subtract,
  ethAllocationOutcome,
  checkThat,
} from '../../';
import * as LedgerUpdate from '../ledger-update/protocol';
import {
  Allocation,
  isAllocationOutcome,
  Outcome,
  AllocationItem,
  State,
} from '@statechannels/nitro-protocol';

const PROTOCOL = 'direct-funding';
const success = { type: 'final' };
const failure = { type: 'final' };

export interface Init {
  channelId: string;
  minimalAllocation: Allocation;
}

function getHoldings(state: State, destination: string): string {
  const { outcome } = state;

  let currentFunding = chain.holdings(getChannelId(state.channel));
  return checkThat(outcome[0], isAllocationOutcome)
    .allocation.filter(item => item.destination === destination)
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

function obligation(state: State, minimalOutcome: Allocation, destination: string): string {
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

function preDepositOutcome(channelId: string, minimalAllocation: Allocation): Outcome {
  const state = store.getEntry(channelId).latestSupportedState;
  const { allocation } = checkThat(
    store.getEntry(channelId).latestSupportedState.outcome[0],
    isAllocationOutcome
  );

  const destinations = uniqueDestinations(allocation.concat(minimalAllocation));
  const preDepositAllocation = allocation.concat(
    destinations.map(destination => ({
      destination,
      amount: obligation(state, minimalAllocation, destination),
    }))
  );

  return ethAllocationOutcome(preDepositAllocation);
}

function amount(item: AllocationItem): string {
  return item.amount;
}

function postDepositOutcome(channelId: string): Outcome {
  const { allocation } = checkThat(
    store.getEntry(channelId).latestSupportedState.outcome[0],
    isAllocationOutcome
  );
  const destinations = uniqueDestinations(allocation);

  const postDepositAllocation = destinations.map(destination => ({
    destination,
    amount: allocation
      .filter(i => i.destination === destination)
      .map(amount)
      .reduce(add),
  }));

  return ethAllocationOutcome(postDepositAllocation);
}

interface Base {
  targetChannelId: string;
  minimalOutcome: Allocation;
}

type UpdateOutcome = Base & {
  targetOutcome: Outcome;
};

function preFundLedgerUpdateParams({
  targetChannelId: channelId,
  minimalOutcome,
}: UpdateOutcome): LedgerUpdate.Init {
  return {
    channelId,
    targetOutcome: preDepositOutcome(channelId, minimalOutcome),
  };
}
const updatePrefundOutcome = {
  on: {
    '': { target: 'waiting', cond: 'noUpdateNeeded' },
  },
  invoke: {
    src: 'ledgerUpdate',
    data: preFundLedgerUpdateParams.name,
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

function postFundLedgerUpdateParams({ targetChannelId }: UpdateOutcome) {
  return {
    targetChannelId,
    targetOutcome: postDepositOutcome(targetChannelId),
  };
}
const updatePostFundOutcome = {
  invoke: {
    src: 'ledgerUpdate',
    data: postFundLedgerUpdateParams.name,
    onDone: 'success',
  },
};

export const config = {
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
  noUpdateNeeded: x => true,
  safeToDeposit: x => true,
  funded: x => true,
};
export const mockOptions = { guards };
