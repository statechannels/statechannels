import {Machine, MachineConfig} from 'xstate';

import {SimpleEthAllocation} from '../store/types';
import * as AdvanceChannel from './advance-channel';

import {MachineFactory, getDataAndInvoke} from '../utils/workflow-utils';
import {Store} from '../store';
import {bigNumberify} from 'ethers/utils';
import * as Depositing from './depositing';
import {add} from '../utils/math-utils';
const PROTOCOL = 'create-and-direct-fund';

export enum Indices {
  Left = 0,
  Right = 0
}

export type Init = {
  allocation: SimpleEthAllocation;
  channelId: string;
};

export const advanceChannelArgs = (i: 1 | 3) => ({channelId}: Init): AdvanceChannel.Init => ({
  channelId,
  targetTurnNum: i
});

const preFundSetup = {
  invoke: {
    id: 'preFundSetup',
    src: 'advanceChannel',
    data: advanceChannelArgs(1),
    onDone: 'depositing'
  }
};

// FIXME: Abort should not be success

const depositing = getDataAndInvoke('getDepositingInfo', 'invokeDepositing', 'postFundSetup');

const postFundSetup = {
  invoke: {
    id: 'postFundSetup',
    src: 'advanceChannel',
    data: advanceChannelArgs(3),
    onDone: 'success'
  }
};

type Context = Init;
export const config: MachineConfig<Context, any, any> = {
  key: PROTOCOL,
  initial: 'preFundSetup',
  states: {
    preFundSetup,
    depositing,
    postFundSetup,
    success: {
      type: 'final' as 'final'
    }
  }
};

export const machine: MachineFactory<Init, any> = (store: Store, init: Init) => {
  async function getDepositingInfo({
    allocation: minimalAllocation,
    channelId
  }: Init): Promise<Depositing.Init> {
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
  const services = {
    invokeDepositing: Depositing.machine(store),
    advanceChannel: AdvanceChannel.machine(store),
    getDepositingInfo
  };

  const options = {services};
  return Machine(config).withConfig(options, init);
};
