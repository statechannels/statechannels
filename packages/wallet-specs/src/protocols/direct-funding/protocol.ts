import {
  add,
  max,
  subtract,
  ethAllocationOutcome,
  getEthAllocation,
  FINAL,
  Store,
  MachineFactory,
  gt,
  eq,
} from '../../';
import { Allocation, Outcome } from '@statechannels/nitro-protocol';
import { Machine, DoneInvokeEvent, MachineConfig } from 'xstate';
import { SupportState, Depositing } from '..';
import _ from 'lodash';
import { bigNumberify } from 'ethers/utils';

const PROTOCOL = 'direct-funding';
const success = { type: FINAL };
const failure = { type: FINAL };

/*
Direct funding currently works like this:
BEFORE DEPOSITING:
- We check that the channel is fully-funded
- We start with a ledger channel with some allocation A1
- We're given a "minimal allocation" A2.
  - A2 must have exactly one allocation item per participant.
  - This item may allocate zero to some destination.
  - Suppose we append A2 to A1. This might over-allocate to certain destinations.
- We thus iterate through A2 and subtract off the excess, resulting in A2'
  - It is participants[i]'s responsibility to ensure that A2'[i] is covered.
- We update the allocation to be A3 = A1.concat(A2)

DEPOSITING:
- When everything up to A2'[i] is covered on-chain, participant i should deposit A2'[i].

AFTER DEPOSITING:
- We roll up repeat destinations into a single allocation item.
  - This is only a safe operation when the channel is fully funded.

WARNING: it is _not_ safe to restart this direct funding protocol. More thought is needed.
*/

export interface Init {
  channelId: string;
  minimalAllocation: Allocation;
}

const checkCurrentLevel = {
  invoke: {
    src: 'checkCurrentLevel',
    onDone: 'updatePrefundOutcome',
  },
};

/*
Since the machine doesn't have sync access to a store, we invoke a promise to get the
desired outcome; that outcome can then be forwarded to the invoked service service.
TODO: extract this pattern to other protocols.
*/

function getDetaAndInvoke<T>(data: string, src: string, onDone: string) {
  return {
    initial: 'getData',
    states: {
      getData: { invoke: { src: data, onDone: 'invokeService' } },
      invokeService: {
        invoke: {
          src,
          data: (_, { data }: DoneInvokeEvent<T>) => data,
          onDone: 'done',
          autoForward: true,
        },
      },
      done: { type: FINAL },
    },
    onDone,
  };
}

export const config: MachineConfig<any, any, any> = {
  key: PROTOCOL,
  initial: 'checkCurrentLevel',
  states: {
    checkCurrentLevel,
    updatePrefundOutcome: getDetaAndInvoke('getPrefundOutcome', 'supportState', 'funding'),
    funding: getDetaAndInvoke('getDepositingInfo', 'fundingService', 'updatePostfundOutcome'),
    updatePostfundOutcome: getDetaAndInvoke('getPostfundOutcome', 'supportState', 'success'),
    success,
    failure,
  },
};

type Services = {
  checkCurrentLevel(ctx: Init): Promise<void>;
  getPrefundOutcome(ctx: Init): Promise<SupportState.Init>;
  getPostfundOutcome(ctx: Init): Promise<SupportState.Init>;
  getDepositingInfo(ctx: Init): Promise<Depositing.Init>;
  fundingService: any;
  supportState: any;
};

type Options = { services: Services };

export const machine: MachineFactory<Init, any> = (store: Store, context: Init) => {
  async function checkCurrentLevel(ctx: Init) {
    const { latestSupportedState } = store.getEntry(ctx.channelId);
    const { outcome } = latestSupportedState;
    const allocated = getEthAllocation(outcome)
      .map(i => i.amount)
      .reduce(add, '0');
    const holdings = await store.getHoldings(ctx.channelId);

    if (eq(holdings, 0) && latestSupportedState.turnNum === 0) {
      // This is the only acceptable time to be underfunded
      return;
    }

    if (gt(allocated, holdings)) {
      throw new Error('Channel underfunded');
    }
  }
  async function getDepositingInfo({
    minimalAllocation,
    channelId,
  }: Init): Promise<Depositing.Init> {
    const entry = store.getEntry(channelId);
    let totalBeforeDeposit = '0x0';
    for (let i = 0; i < minimalAllocation.length; i++) {
      const allocation = minimalAllocation[i];
      if (entry.ourIndex === i) {
        return {
          channelId,
          depositAt: totalBeforeDeposit,
          totalAfterDeposit: bigNumberify(totalBeforeDeposit)
            .add(allocation.amount)
            .toHexString(),
        };
      } else {
        totalBeforeDeposit = bigNumberify(allocation.amount)
          .add(totalBeforeDeposit)
          .toHexString();
      }
    }

    throw Error(`Could not find an allocation for participant id ${entry.ourIndex}`);
  }
  async function getPrefundOutcome({
    channelId,
    minimalAllocation,
  }: Init): Promise<SupportState.Init> {
    const state = store.getEntry(channelId).latestSupportedState;
    const { channel } = state;

    if (minimalAllocation.length !== channel.participants.length) {
      throw new Error('Must be exactly one allocation item per participant');
    }

    const outcome = minimalOutcome(state.outcome, minimalAllocation);
    return {
      channelId,
      outcome,
    };
  }

  async function getPostfundOutcome({ channelId }: Init): Promise<SupportState.Init> {
    const { outcome } = store.getEntry(channelId).latestSupportedState;

    return { channelId, outcome: mergeDestinations(outcome) };
  }

  const services: Services = {
    checkCurrentLevel,
    getPrefundOutcome,
    supportState: SupportState.machine(store),
    fundingService: Depositing.machine(store),
    getPostfundOutcome,
    getDepositingInfo,
  };

  const options: Options = { services };
  return Machine(config).withConfig(options, context);
};

function minimalOutcome(currentOutcome: Outcome, minimalEthAllocation: Allocation): Outcome {
  const allocation = getEthAllocation(currentOutcome);

  const preDepositAllocation = allocation.concat(
    minimalEthAllocation.map(({ destination, amount }) => {
      const currentlyAllocated = allocation
        .filter(i => i.destination === destination)
        .map(i => i.amount)
        .reduce(add, '0');

      const amountLeft = bigNumberify(amount).gt(currentlyAllocated)
        ? subtract(amount, currentlyAllocated)
        : '0';
      return { destination, amount: amountLeft };
    })
  );

  return ethAllocationOutcome(preDepositAllocation);
}

function mergeDestinations(outcome: Outcome): Outcome {
  const allocation = getEthAllocation(outcome);
  const destinations = _.uniq(allocation.map(i => i.destination));

  const postDepositAllocation = destinations.map(destination => ({
    destination,
    amount: allocation
      .filter(i => i.destination === destination)
      .map(i => i.amount)
      .reduce(add),
  }));

  return ethAllocationOutcome(postDepositAllocation);
}
