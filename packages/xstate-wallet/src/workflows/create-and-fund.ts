import {Machine, MachineConfig} from 'xstate';

import {SimpleAllocation} from '../store/types';
import * as AdvanceChannel from './advance-channel';

import {MachineFactory, getDataAndInvoke} from '../utils/workflow-utils';
import {Store} from '../store';
import {bigNumberify} from 'ethers/utils';
import * as Depositing from './depositing';
import {add} from '../utils/math-utils';
import {isSimpleEthAllocation} from '../utils/outcome';
import {checkThat} from '../utils';
const PROTOCOL = 'create-and-fund';

export enum Indices {
  Left = 0,
  Right = 0
}

export type Init = {
  allocation: SimpleAllocation;
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
    success: {type: 'final'}
  }
};

export const machine: MachineFactory<Init, any> = (store: Store, init: Init) => {
  async function getDepositingInfo({allocation, channelId}: Init): Promise<Depositing.Init> {
    const {supported, myIndex} = await store.getEntry(channelId);
    const outcome = checkThat(supported?.outcome, isSimpleEthAllocation);

    const fundedAt = outcome.allocationItems.map(a => a.amount).reduce(add);
    let depositAt = bigNumberify(0);
    for (let i = 0; i < allocation.allocationItems.length; i++) {
      const {amount} = allocation.allocationItems[i];
      if (i !== myIndex) depositAt = depositAt.add(amount);
      else {
        const totalAfterDeposit = depositAt.add(amount);
        return {channelId, depositAt, totalAfterDeposit, fundedAt};
      }
    }

    throw Error(`Could not find an allocation for participant id ${myIndex}`);
  }

  const services = {
    invokeDepositing: Depositing.machine(store),
    advanceChannel: AdvanceChannel.machine(store),
    getDepositingInfo
  };

  const options = {services};
  return Machine(config).withConfig(options, init);
};
