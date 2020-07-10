import {Machine, MachineConfig} from 'xstate';
import _ from 'lodash';
import {BigNumber} from 'ethers';
import {AddressZero, HashZero, Zero} from '@ethersproject/constants';

import {
  add,
  isSimpleEthAllocation,
  simpleEthAllocation,
  checkThat,
  Outcome,
  SimpleAllocation,
  AllocationItem,
  Destination
} from '@statechannels/wallet-core';

import {Store} from '../store';
import * as Depositing from './depositing';
import * as SupportState from './support-state';
import {getDataAndInvoke2, MachineFactory} from '../utils/workflow-utils';

const WORKFLOW = 'direct-funding';

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
  minimalAllocation: AllocationItem[];
}

const checkCurrentLevel = {
  invoke: {
    src: 'checkCurrentLevel',
    onDone: 'updatePrefundOutcome'
  }
};

export const config: MachineConfig<any, any, any> = {
  key: WORKFLOW,
  initial: 'checkCurrentLevel',
  states: {
    checkCurrentLevel,
    updatePrefundOutcome: getDataAndInvoke2('getPrefundOutcome', 'supportState', 'funding'),
    funding: getDataAndInvoke2('getDepositingInfo', 'fundingService', 'updatePostfundOutcome'),
    updatePostfundOutcome: getDataAndInvoke2('getPostfundOutcome', 'supportState', 'success'),
    success: {type: 'final'},
    failure: {type: 'final'}
  }
};

type Services = {
  checkCurrentLevel(ctx: Init): Promise<void>;
  getPrefundOutcome(ctx: Init): Promise<SupportState.Init>;
  getPostfundOutcome(ctx: Init): Promise<SupportState.Init>;
  getDepositingInfo(ctx: Init): Promise<Depositing.Init>;
  fundingService: any;
  supportState: any;
};

type Options = {services: Services};

export const machine: MachineFactory<Init, any> = (store: Store, context: Init) => {
  async function checkCurrentLevel(ctx: Init) {
    const {supported: supportedState} = await store.getEntry(ctx.channelId);

    const outcome = checkThat(supportedState.outcome, isSimpleEthAllocation);
    // TODO This prevents us from funding an app channel
    const allocated = outcome.allocationItems.map(a => a.amount).reduce((a, b) => a.add(b), Zero);
    const chainInfo = await store.chain.getChainInfo(ctx.channelId);

    if (allocated.gt(chainInfo.amount))
      throw new Error('DirectFunding: Channel outcome is already underfunded; aborting');
  }

  function minimalOutcome(
    currentOutcome: SimpleAllocation,
    minimalEthAllocation: AllocationItem[]
  ): Outcome {
    const allocationItems = currentOutcome.allocationItems.concat(
      minimalEthAllocation.map(({destination, amount}) => {
        const currentlyAllocated = currentOutcome.allocationItems
          .filter(i => i.destination === destination)
          .map(i => i.amount)
          .reduce(add);

        const amountLeft = BigNumber.from(amount).gt(currentlyAllocated)
          ? amount.sub(currentlyAllocated)
          : Zero;
        return {destination, amount: amountLeft};
      })
    );

    return simpleEthAllocation(allocationItems);
  }

  function mergeDestinations(outcome: SimpleAllocation): SimpleAllocation {
    const destinations: Destination[] = _.uniq(outcome.allocationItems.map(i => i.destination));

    const allocationItems = destinations.map(destination => ({
      destination,
      amount: outcome.allocationItems
        .filter(i => i.destination === destination)
        .map(i => i.amount)
        .reduce(add)
    }));

    return simpleEthAllocation(allocationItems);
  }

  async function getDepositingInfo({minimalAllocation, channelId}: Init): Promise<Depositing.Init> {
    const {supported: supportedState, myIndex} = await store.getEntry(channelId);
    const supportedOutcome = supportedState.outcome;
    if (!isSimpleEthAllocation(supportedOutcome)) {
      throw new Error('Unsupported outcome');
    }
    let totalBeforeDeposit = Zero;
    for (let i = 0; i < minimalAllocation.length; i++) {
      const allocation = minimalAllocation[i];
      if (myIndex === i) {
        const fundedAt = supportedOutcome.allocationItems.map(a => a.amount).reduce(add);

        return {
          channelId,
          depositAt: totalBeforeDeposit,
          totalAfterDeposit: BigNumber.from(totalBeforeDeposit).add(allocation.amount),

          fundedAt
        };
      } else {
        totalBeforeDeposit = BigNumber.from(allocation.amount).add(totalBeforeDeposit);
      }
    }

    throw Error(`Could not find an allocation for participant id ${myIndex}`);
  }

  async function getPrefundOutcome({
    channelId,
    minimalAllocation
  }: Init): Promise<SupportState.Init> {
    const entry = await store.getEntry(channelId);
    const {channelConstants} = entry;

    if (minimalAllocation.length !== channelConstants.participants.length) {
      throw new Error('Must be exactly one allocation item per participant');
    }

    // TODO: Safety checks?
    if (entry.isSupported) {
      const outcome = minimalOutcome(entry.latest.outcome as SimpleAllocation, minimalAllocation);
      return {
        state: {
          ...entry.latest,
          ...entry.channelConstants,
          outcome,
          turnNum: entry.latest.turnNum + 1
        }
      };
    } else {
      return {
        state: {
          ...entry.channelConstants,
          challengeDuration: 1,
          isFinal: false,
          turnNum: 0,
          outcome: minimalOutcome(simpleEthAllocation([]), minimalAllocation),
          appData: HashZero,
          appDefinition: AddressZero
        }
      };
    }
  }

  async function getPostfundOutcome({channelId}: Init): Promise<SupportState.Init> {
    const {supported} = await store.getEntry(channelId);
    return {
      state: {
        ...supported,
        turnNum: supported.turnNum + 1,
        outcome: mergeDestinations(supported.outcome as SimpleAllocation)
      }
    };
  }

  const services: Services = {
    checkCurrentLevel,
    getPrefundOutcome,
    supportState: SupportState.machine(store),
    fundingService: Depositing.machine(store),
    getPostfundOutcome,
    getDepositingInfo
  };

  const options: Options = {services};
  return Machine(config).withConfig(options, context);
};
