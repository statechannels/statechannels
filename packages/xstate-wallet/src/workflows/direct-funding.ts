import {Machine, MachineConfig} from 'xstate';
import _ from 'lodash';
import {bigNumberify} from 'ethers/utils';
import {AddressZero, HashZero} from 'ethers/constants';

import * as Depositing from './depositing';
import * as SupportState from './support-state';
import {getDataAndInvoke, MachineFactory} from '../utils/workflow-utils';
import {Store} from '../store';
import {Outcome, SimpleEthAllocation} from '../store/types';
import {add} from '../utils/math-utils';

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
  minimalAllocation: SimpleEthAllocation;
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
    updatePrefundOutcome: getDataAndInvoke('getPrefundOutcome', 'supportState', 'funding'),
    funding: getDataAndInvoke('getDepositingInfo', 'fundingService', 'updatePostfundOutcome'),
    updatePostfundOutcome: getDataAndInvoke('getPostfundOutcome', 'supportState', 'success'),
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
    const entry = await store.getEntry(ctx.channelId);

    if (!entry.supported) {
      // TODO figure out what to do here.
      throw new Error('Unsafe channel state');
    }

    const {outcome} = entry.supported;
    if (outcome.type !== 'SimpleEthAllocation') {
      throw new Error('Only support SimpleEthAllocation');
    }
    // TODO This prevents us from funding an app channel
    const allocated = outcome.allocationItems
      .map(a => a.amount)
      .reduce((a, b) => {
        return a.add(b);
      }, bigNumberify(0));
    const chainInfo = await store.chain.getChainInfo(ctx.channelId);

    if (allocated.gt(chainInfo.amount))
      throw new Error('DirectFunding: Channel outcome is already underfunded; aborting');
  }

  function minimalOutcome(
    currentOutcome: SimpleEthAllocation,
    minimalEthAllocation: SimpleEthAllocation
  ): Outcome {
    const allocationItems = currentOutcome.allocationItems.concat(
      minimalEthAllocation.allocationItems.map(({destination, amount}) => {
        const currentlyAllocated = currentOutcome.allocationItems
          .filter(i => i.destination === destination)
          .map(i => i.amount)
          .reduce(add);

        const amountLeft = bigNumberify(amount).gt(currentlyAllocated)
          ? amount.sub(currentlyAllocated)
          : bigNumberify(0);
        return {destination, amount: amountLeft};
      })
    );

    return {type: 'SimpleEthAllocation', allocationItems};
  }

  function mergeDestinations(outcome: SimpleEthAllocation): SimpleEthAllocation {
    const destinations = _.uniq(outcome.allocationItems.map(i => i.destination));

    const allocationItems = destinations.map(destination => ({
      destination,
      amount: outcome.allocationItems
        .filter(i => i.destination === destination)
        .map(i => i.amount)
        .reduce(add)
    }));

    return {type: 'SimpleEthAllocation', allocationItems};
  }

  async function getDepositingInfo({minimalAllocation, channelId}: Init): Promise<Depositing.Init> {
    const entry = await store.getEntry(channelId);
    if (!entry.supported) {
      throw new Error('Unsupported state');
    }
    if (entry.supported.outcome.type !== 'SimpleEthAllocation') {
      throw new Error('Unsupported outcome');
    }
    let totalBeforeDeposit = bigNumberify(0);
    for (let i = 0; i < minimalAllocation.allocationItems.length; i++) {
      const allocation = minimalAllocation.allocationItems[i];
      if (entry.myIndex === i) {
        const fundedAt = entry.supported.outcome.allocationItems.map(a => a.amount).reduce(add);

        return {
          channelId,
          depositAt: totalBeforeDeposit,
          totalAfterDeposit: bigNumberify(totalBeforeDeposit).add(allocation.amount),

          fundedAt
        };
      } else {
        totalBeforeDeposit = bigNumberify(allocation.amount).add(totalBeforeDeposit);
      }
    }

    throw Error(`Could not find an allocation for participant id ${entry.myIndex}`);
  }

  async function getPrefundOutcome({
    channelId,
    minimalAllocation
  }: Init): Promise<SupportState.Init> {
    const entry = await store.getEntry(channelId);
    const {channelConstants} = entry;

    if (minimalAllocation.allocationItems.length !== channelConstants.participants.length) {
      throw new Error('Must be exactly one allocation item per participant');
    }

    // TODO: Safety checks?
    if (entry.supported) {
      const outcome = minimalOutcome(
        entry.latest.outcome as SimpleEthAllocation,
        minimalAllocation
      );
      return {
        state: {
          ...entry.latest,
          ...entry.channelConstants,
          outcome,
          turnNum: entry.latest.turnNum.add(1)
        }
      };
    } else {
      return {
        state: {
          ...entry.channelConstants,
          challengeDuration: bigNumberify(1),
          isFinal: false,
          turnNum: bigNumberify(0),
          outcome: minimalOutcome(
            {type: 'SimpleEthAllocation', allocationItems: []},
            minimalAllocation
          ),
          appData: HashZero,
          appDefinition: AddressZero
        }
      };
    }
  }

  async function getPostfundOutcome({channelId}: Init): Promise<SupportState.Init> {
    const {supported, channelConstants} = await store.getEntry(channelId);
    if (!supported) {
      throw new Error('State not supported');
    }
    return {
      state: {
        ...supported,
        ...channelConstants,
        turnNum: supported.turnNum.add(1),
        outcome: mergeDestinations(supported.outcome as SimpleEthAllocation)
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
