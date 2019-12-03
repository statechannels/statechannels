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
import * as LedgerUpdate from '../ledger-update/protocol';

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
  minimalOutcome: Allocation;
}

type UpdateOutcome = Base & {
  targetOutcome: Outcome;
};

function preFundLedgerUpdateParams({
  targetChannelID: channelID,
  minimalOutcome,
}: UpdateOutcome): LedgerUpdate.Init {
  return {
    channelID,
    targetOutcome: preDepositOutcome(channelID, minimalOutcome),
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

function postFundLedgerUpdateParams({ targetChannelID }: UpdateOutcome) {
  return {
    targetChannelID,
    targetOutcome: postDepositOutcome(targetChannelID),
  };
}
const updatePostFundOutcome = {
  invoke: {
    src: 'ledgerUpdate',
    data: postFundLedgerUpdateParams.name,
    onDone: 'success',
  },
};

const config = {
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

saveConfig(config, __dirname, { guards });
