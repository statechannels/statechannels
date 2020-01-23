import { Allocation, Outcome } from '@statechannels/nitro-protocol';
import { Machine, MachineConfig } from 'xstate';
import _ from 'lodash';
import { bigNumberify } from 'ethers/utils';
import { HashZero, AddressZero } from 'ethers/constants';

import { getDetaAndInvoke } from '../../machine-utils';
import {
  add,
  subtract,
  ethAllocationOutcome,
  getEthAllocation,
  FINAL,
  MachineFactory,
  gt,
} from '../../';
import { IStore } from '../../store';

import { SupportState, Depositing } from '..';

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

export const machine: MachineFactory<Init, any> = (store: IStore, context: Init) => {
  async function checkCurrentLevel(ctx: Init) {
    const entry = store.getEntry(ctx.channelId);

    if (entry.latestStateSupportedByMe && !entry.hasSupportedState) {
      // TODO figure out what to do here.
      throw new Error('Unsafe channel state');
    }

    const { outcome } = entry.latestSupportedState;

    const allocated = getEthAllocation(outcome)
      .map(i => i.amount)
      .reduce(add, '0');
    const holdings = await store.getHoldings(ctx.channelId);

    if (gt(allocated, holdings)) throw new Error('Channel underfunded');
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
        const fundedAt = getEthAllocation(entry.latestSupportedState.outcome)
          .map(a => a.amount)
          .reduce(add);
        return {
          channelId,
          depositAt: totalBeforeDeposit,
          totalAfterDeposit: bigNumberify(totalBeforeDeposit)
            .add(allocation.amount)
            .toHexString(),
          fundedAt,
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
    const entry = store.getEntry(channelId);
    const { channel } = entry;

    if (minimalAllocation.length !== channel.participants.length) {
      throw new Error('Must be exactly one allocation item per participant');
    }

    // TODO: Safety checks?
    if (entry.hasSupportedState) {
      const outcome = minimalOutcome(entry.latestSupportedState.outcome, minimalAllocation);
      return {
        state: {
          ...entry.latestSupportedState,
          outcome,
          turnNum: entry.latestSupportedState.turnNum + 1,
        },
      };
    } else {
      return {
        state: {
          channel,
          challengeDuration: 1,
          isFinal: false,
          turnNum: 0,
          outcome: minimalOutcome([], minimalAllocation),
          appData: HashZero,
          appDefinition: AddressZero,
        },
      };
    }
  }

  async function getPostfundOutcome({ channelId }: Init): Promise<SupportState.Init> {
    const { latestSupportedState } = store.getEntry(channelId);

    return {
      state: {
        ...latestSupportedState,
        turnNum: latestSupportedState.turnNum + 1,
        outcome: mergeDestinations(latestSupportedState.outcome),
      },
    };
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
