import {
  add,
  chain,
  getChannelId,
  max,
  subtract,
  ethAllocationOutcome,
  getEthAllocation,
  FINAL,
  Store,
  MachineFactory,
} from '../../';
import * as LedgerUpdate from '../ledger-update/protocol';
import { Allocation, Outcome, AllocationItem, State } from '@statechannels/nitro-protocol';
import { Machine, DoneInvokeEvent } from 'xstate';
import { SupportState } from '..';

const PROTOCOL = 'direct-funding';
const success = { type: FINAL };
const failure = { type: FINAL };

export interface Init {
  channelId: string;
  minimalAllocation: Allocation;
}

/*
Since the machine doesn't have sync access to a store, we invoke a promise to get the
desired outcome; that outcome can then be forwarded to the supportState service.
TODO: extract this pattern to other protocols.
*/
const updateOutcome = (src: 'getPrefundOutcome' | 'getPostfundOutcome') => {
  return {
    initial: 'getOutcome',
    states: {
      getOutcome: { invoke: { src, onDone: 'updateOutcome' } },
      updateOutcome: {
        invoke: {
          src: 'supportState',
          data: ({ channelId }: Init, { data }: DoneInvokeEvent<Outcome>): SupportState.Init => ({
            channelId,
            outcome: data,
          }),
          onDone: 'done',
        },
      },
      done: { type: FINAL },
    },
  };
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

export const config = {
  key: PROTOCOL,
  initial: 'updatePrefundOutcome',
  states: {
    updatePrefundOutcome: { ...updateOutcome('getPrefundOutcome'), onDone: 'waiting' },
    waiting,
    deposit,
    updatePostfundOutcome: { ...updateOutcome('getPostfundOutcome'), onDone: 'success' },
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

export const machine: MachineFactory<Init, any> = (store: Store, context: Init) => {
  function getHoldings(state: State, destination: string): string {
    const { outcome } = state;

    let currentFunding = chain.holdings(getChannelId(state.channel));

    return getEthAllocation(outcome)
      .filter(item => item.destination === destination)
      .map(item => {
        const payout = Math.min(currentFunding, Number(item.amount));
        currentFunding -= payout;
        return payout.toString();
      })
      .reduce(add);
  }

  function preDepositOutcome(channelId: string, minimalAllocation: Allocation): Outcome {
    const state = store.getEntry(channelId).latestSupportedState;
    const allocation = getEthAllocation(store.getEntry(channelId).latestSupportedState.outcome);

    const destinations = uniqueDestinations(allocation.concat(minimalAllocation));
    const preDepositAllocation = allocation.concat(
      destinations.map(destination => ({
        destination,
        amount: obligation(state, minimalAllocation, destination),
      }))
    );

    return ethAllocationOutcome(preDepositAllocation);
  }
  function postDepositOutcome(channelId: string): Outcome {
    const allocation = getEthAllocation(store.getEntry(channelId).latestSupportedState.outcome);
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
  function preFundLedgerUpdateParams({
    targetChannelId: channelId,
    minimalOutcome,
  }): LedgerUpdate.Init {
    return {
      channelId,
      targetOutcome: preDepositOutcome(channelId, minimalOutcome),
    };
  }
  function postFundLedgerUpdateParams({ targetChannelId }) {
    return {
      targetChannelId,
      targetOutcome: postDepositOutcome(targetChannelId),
    };
  }

  return Machine(config);
};

function getHoldings(state: State, destination: string): string {
  const { outcome } = state;

  let currentFunding = chain.holdings(getChannelId(state.channel));
  return getEthAllocation(outcome)
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

function amount(item: AllocationItem): string {
  return item.amount;
}
