import {
  add,
  getChannelId,
  max,
  subtract,
  ethAllocationOutcome,
  getEthAllocation,
  FINAL,
  Store,
  MachineFactory,
} from '../../';
import { Allocation, Outcome, State } from '@statechannels/nitro-protocol';
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

export const config = {
  key: PROTOCOL,
  initial: 'updatePrefundOutcome',
  states: {
    updatePrefundOutcome: { ...updateOutcome('getPrefundOutcome'), onDone: 'funding' },
    funding: { invoke: { src: 'fundingService' }, onDone: 'updatePostfundOutcome' },
    updatePostfundOutcome: { ...updateOutcome('getPostfundOutcome'), onDone: 'success' },
    success,
    failure,
  },
};

type Services = {
  getPrefundOutcome: any;
  getPostfundOutcome: any;
  fundingService: any;
  supportState: any;
};

type Options = { services: Services };

export const machine: MachineFactory<Init, any> = (store: Store, context: Init) => {
  async function getPrefundOutcome({ channelId, minimalAllocation }: Init): Promise<Outcome> {
    const state = store.getEntry(channelId).latestSupportedState;
    const holdings = getHoldings(state, channelId);

    return minimalOutcome(state.outcome, minimalAllocation, holdings);
  }

  async function getPostfundOutcome({ channelId }: Init): Promise<Outcome> {
    const { outcome } = store.getEntry(channelId).latestSupportedState;

    return flattenOutcome(outcome);
  }

  const services: Services = {
    getPrefundOutcome,
    supportState: SupportState.machine(store),
    fundingService: async () => true,
    getPostfundOutcome,
  };

  const options: Options = { services };
  return Machine(config).withConfig(options, context);
};

function getHoldings(state: State, destination: string): string {
  const { outcome } = state;

  // TODO
  let currentFunding = 10;
  return getEthAllocation(outcome)
    .filter(item => item.destination === destination)
    .map(item => {
      const payout = Math.min(currentFunding, Number(item.amount));
      currentFunding -= payout;
      return payout.toString();
    })
    .reduce(add);
}

function uniqueDestinations(outcome: Allocation): string[] {
  const firstEntry = (value, index, self) => {
    return self.indexOf(value) === index;
  };

  return outcome.map(i => i.destination).filter(firstEntry);
}

function minimalOutcome(
  currentOutcome: Outcome,
  minimalEthAllocation: Allocation,
  currentHoldings: string
): Outcome {
  if (uniqueDestinations(minimalEthAllocation).length !== minimalEthAllocation.length) {
    throw new Error('Duplicate destination in minimal allocation');
  }

  const allocation = getEthAllocation(currentOutcome);
  const destinations = uniqueDestinations(allocation.concat(minimalEthAllocation));

  const preDepositAllocation = allocation.concat(
    destinations.map(destination => {
      const myTargetLevel = (
        minimalEthAllocation.find(item => item.destination === destination) || {
          amount: '0',
        }
      ).amount;
      const amount = max(subtract(myTargetLevel, currentHoldings), 0);

      return { destination, amount };
    })
  );

  return ethAllocationOutcome(preDepositAllocation);
}

function flattenOutcome(outcome: Outcome): Outcome {
  const allocation = getEthAllocation(outcome);
  const destinations = uniqueDestinations(allocation);

  const postDepositAllocation = destinations.map(destination => ({
    destination,
    amount: allocation
      .filter(i => i.destination === destination)
      .map(i => i.amount)
      .reduce(add),
  }));

  return ethAllocationOutcome(postDepositAllocation);
}
