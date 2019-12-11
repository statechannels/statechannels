import { assign, DoneInvokeEvent, Machine } from 'xstate';
import { CreateNullChannel, DirectFunding, SupportState } from '..';
import {
  Allocation,
  Channel,
  ensureExists,
  MachineFactory,
  Store,
  success,
} from '../..';

const PROTOCOL = 'ledger-funding';

interface Init {
  targetChannelId: string;
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
    data: (_, { data }: DoneInvokeEvent<CreateNullChannel.Init>) => ({
      channel: data.channel,
      outcome: data.outcome,
    }),
    onDone: { target: 'success', actions: assignLedgerChannelId },
    autoForward: true,
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
    onDone: 'fundTarget',
    autoForward: true,
  },
};

const fundTarget = {
  initial: 'getTargetOutcome',
  states: {
    getTargetOutcome: {
      invoke: {
        src: 'getTargetOutcome',
        onDone: 'ledgerUpdate',
      },
    },
    ledgerUpdate: {
      invoke: {
        src: 'supportState',
        data: (
          ctx: LedgerExists,
          { data }: DoneInvokeEvent<{ outcome: Allocation }>
        ) => ({
          channelId: ctx.ledgerChannelId,
          outcome: data.outcome,
        }),
        autoForward: true,
        onDone: 'success',
      },
    },
    success,
  },
  onDone: 'success',
};

export const config = {
  key: PROTOCOL,
  initial: 'waitForChannel',
  states: {
    waitForChannel,
    fundLedger,
    fundTarget,
    success,
  },
};

export type Services = {
  findLedgerChannelId(
    ctx: Init
  ): Promise<{ type: 'FOUND'; channelId: string } | { type: 'NOT_FOUND' }>;
  getNullChannelArgs(ctx: Init): Promise<CreateNullChannel.Init>;
  createNullChannel: any;
  directFunding: any;
  getTargetOutcome(ctx: LedgerExists): Promise<SupportState.Init>;
  supportState: any;
};

export const guards = {
  channelFound: (
    _,
    { data }: DoneInvokeEvent<{ type: 'FOUND' | 'NOT_FOUND' }>
  ) => data.type === 'FOUND',
};

export const machine: MachineFactory<Init, any> = (
  store: Store,
  context: Init
) => {
  function directFundingArgs(ctx: LedgerExists): DirectFunding.Init {
    return {
      channelId: ctx.ledgerChannelId,
      minimalOutcome: store.getLatestState(ctx.targetChannelId).outcome,
    };
  }

  async function getNullChannelArgs({
    targetChannelId,
  }: Init): Promise<CreateNullChannel.Init> {
    const { channel: targetChannel, latestSupportedState } = store.getEntry(
      targetChannelId
    );

    const channel: Channel = {
      ...targetChannel,
      channelNonce: store.getNextNonce(targetChannel.participants),
    };

    // TODO: check that the latest supported state is the last prefund setup state?
    const { outcome } = ensureExists(latestSupportedState);

    return {
      channel,
      outcome,
    };
  }

  async function getTargetOutcome({
    targetChannelId,
    ledgerChannelId,
  }: LedgerExists): Promise<SupportState.Init> {
    // const { latestState: ledgerState } = store.getEntry(ledgerChannelId);
    // const { latestState: targetChannelState } = store.getEntry(targetChannelId);

    const outcome: Allocation = [
      {
        destination: targetChannelId,
        amount: 'TODO', // TODO
      },
    ];
    return {
      channelId: ledgerChannelId,
      outcome,
    };
  }

  const services: Services = {
    findLedgerChannelId: async () => ({ type: 'NOT_FOUND' }), // TODO
    getNullChannelArgs,
    createNullChannel: CreateNullChannel.machine(store),
    directFunding: async () => true,
    getTargetOutcome,
    supportState: SupportState.machine(store),
  };

  const options = { services, guards };

  return Machine(config).withConfig(options, context);
};
