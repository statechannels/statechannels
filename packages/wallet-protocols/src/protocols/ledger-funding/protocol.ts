import { assign, DoneInvokeEvent, Machine, MachineConfig } from 'xstate';
import { Allocation } from '@statechannels/nitro-protocol';

import { allocateToTarget, getEthAllocation } from '../../calculations';
import { Channel, ObsoleteStore, success } from '../..';
import { MachineFactory, getDataAndInvoke } from '../../machine-utils';
import { Funding } from '../../ChannelStoreEntry';

import { CreateNullChannel, DirectFunding, SupportState } from '..';

const PROTOCOL = 'ledger-funding';

export interface Init {
  targetChannelId: string;
  deductions: Allocation;
}

/*
My wallet's rule is to have at most one ledger channel open with any given peer.
Therefore, two correct wallets should agree on which existing ledger channel, if any, to use
in order to fund the target channel.

A peer is identified by their participantId.
*/

const assignLedgerChannelId = assign(
  (ctx: Init, event: DoneInvokeEvent<{ channelId: string }>) => ({
    ...ctx,
    ledgerChannelId: event.data.channelId,
  })
);

const lookForExistingChannel = {
  invoke: {
    src: 'findLedgerChannelId',
    onDone: [
      {
        target: 'success',
        cond: 'channelFound',
        actions: assignLedgerChannelId,
      },
      { target: 'determineLedgerChannel' },
    ],
  },
};

const determineLedgerChannel = {
  invoke: {
    src: 'getNullChannelArgs',
    onDone: 'createNewLedger',
  },
};

const createNewLedger = {
  invoke: {
    src: 'createNullChannel',
    data: (_, { data }: DoneInvokeEvent<CreateNullChannel.Init>) => data,
    onDone: { target: 'success', actions: assignLedgerChannelId },
  },
};

const waitForChannel = {
  initial: 'lookForExistingChannel',
  states: {
    lookForExistingChannel,
    determineLedgerChannel,
    createNewLedger,
    success,
  },
  onDone: { target: 'fundLedger' },
};

type LedgerExists = Init & { ledgerChannelId: string };
const fundLedger = {
  invoke: {
    src: 'directFunding',
    data: ({ ledgerChannelId, deductions }: LedgerExists): DirectFunding.Init => ({
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
  initial: 'waitForChannel',
  states: {
    waitForChannel,
    fundLedger,
    fundTarget,
    updateFunding,
    success,
  },
};

type LedgerLookup = { type: 'FOUND'; channelId: string } | { type: 'NOT_FOUND' };
export type Services = {
  findLedgerChannelId(ctx: Init): Promise<LedgerLookup>;
  getNullChannelArgs(ctx: Init): Promise<CreateNullChannel.Init>;
  createNullChannel: any;
  directFunding: any;
  getTargetOutcome(ctx: LedgerExists): Promise<SupportState.Init>;
  updateFunding(ctx: LedgerExists): Promise<void>;
  supportState: ReturnType<typeof SupportState.machine>;
};

export const guards = {
  channelFound: (_, { data }: DoneInvokeEvent<LedgerLookup>) => data.type === 'FOUND',
};

export const machine: MachineFactory<Init, any> = (store: ObsoleteStore, context: Init) => {
  async function getNullChannelArgs({ targetChannelId }: Init): Promise<CreateNullChannel.Init> {
    const { channel: targetChannel } = store.getEntry(targetChannelId);

    const channel: Channel = {
      ...targetChannel,
      channelNonce: store.getNextNonce(targetChannel.participants),
    };

    // TODO: check that the latest supported state is the last prefund setup state?

    return { channel };
  }

  async function getTargetOutcome({
    targetChannelId,
    ledgerChannelId,
    deductions,
  }: LedgerExists): Promise<SupportState.Init> {
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

  async function updateFunding({ targetChannelId, ledgerChannelId }: LedgerExists) {
    const funding: Funding = { type: 'Indirect', ledgerId: ledgerChannelId };
    await store.setFunding(targetChannelId, funding);
  }

  const services: Services = {
    findLedgerChannelId: async () => ({ type: 'NOT_FOUND' }), // TODO
    getNullChannelArgs,
    createNullChannel: CreateNullChannel.machine(store),
    directFunding: DirectFunding.machine(store),
    getTargetOutcome,
    updateFunding,
    supportState: SupportState.machine(store),
  };

  const options = { services, guards };

  return Machine(config).withConfig(options, context);
};
