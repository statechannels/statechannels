import { Machine, MachineConfig } from 'xstate';
import { Allocation } from '@statechannels/nitro-protocol';

import { allocateToTarget, getEthAllocation } from '../../calculations';
import { Store, success } from '../..';
import { MachineFactory, getDataAndInvoke } from '../../machine-utils';
import { Funding } from '../../ChannelStoreEntry';

import { CreateNullChannel, DirectFunding, SupportState } from '..';

const PROTOCOL = 'ledger-funding';

export interface Init {
  ledgerChannelId: string;
  targetChannelId: string;
  deductions: Allocation;
}

const fundLedger = {
  invoke: {
    src: 'directFunding',
    data: ({ ledgerChannelId, deductions }: Init): DirectFunding.Init => ({
      channelId: ledgerChannelId,
      minimalAllocation: deductions,
    }),
    onDone: 'fundTarget',
  },
};
const fundTarget = getDataAndInvoke('getTargetOutcome', 'supportState', 'updateFunding');
const updateFunding = {
  invoke: {
    src: 'updateFunding',
    onDone: 'success',
  },
};

export const config: MachineConfig<any, any, any> = {
  key: PROTOCOL,
  initial: 'fundLedger',
  states: {
    fundLedger,
    fundTarget,
    updateFunding,
    success,
  },
};

export type Services = {
  createNullChannel: any;
  directFunding: any;
  getTargetOutcome(ctx: Init): Promise<SupportState.Init>;
  updateFunding(ctx: Init): Promise<void>;
  supportState: ReturnType<typeof SupportState.machine>;
};

export const machine: MachineFactory<Init, any> = (store: Store, context: Init) => {
  async function getTargetOutcome({
    targetChannelId,
    ledgerChannelId,
    deductions,
  }: Init): Promise<SupportState.Init> {
    const { latestState: ledgerState } = store.getEntry(ledgerChannelId);

    const ledgerAllocation = getEthAllocation(ledgerState.outcome, store.ethAssetHolderAddress);

    return {
      state: {
        ...ledgerState,
        turnNum: ledgerState.turnNum + 1,
        outcome: allocateToTarget(
          ledgerAllocation,
          deductions,
          targetChannelId,
          store.ethAssetHolderAddress
        ),
      },
    };
  }

  async function updateFunding({ targetChannelId, ledgerChannelId }: Init) {
    const funding: Funding = { type: 'Indirect', ledgerId: ledgerChannelId };
    await store.setFunding(targetChannelId, funding);
  }

  const services: Services = {
    createNullChannel: CreateNullChannel.machine(store),
    directFunding: DirectFunding.machine(store),
    getTargetOutcome,
    updateFunding,
    supportState: SupportState.machine(store),
  };

  const options = { services };

  return Machine(config).withConfig(options, context);
};
