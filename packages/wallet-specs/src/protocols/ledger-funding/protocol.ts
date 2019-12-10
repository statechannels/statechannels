import { DoneInvokeEvent, Machine, TransitionConfig } from 'xstate';
import { CreateChannel } from '..';
import { add, MachineFactory, Store, success } from '../..';
import { Init as CreateNullChannelArgs } from '../create-null-channel/protocol';
import { Init as DirectFundingArgs } from '../direct-funding/protocol';
import { Init as LedgerUpdateArgs } from '../ledger-update/protocol';

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

const lookForExistingChannel = {
  invoke: {
    src: 'findLedgerChannelId',
    onDone: [
      {
        target: 'success',
        cond: 'channelFound',
        actions: 'assignLedgerChannelId',
      },
      { target: 'createNewChannel' },
    ],
  },
};

const createNewChannel = {
  invoke: {
    src: 'createNullChannel',
    onDone: {
      target: 'success',
      actions: 'assignLedgerChannelId',
    },
  },
};

const waitForChannel = {
  initial: 'lookForExistingChannel',
  states: {
    lookForExistingChannel,
    createNewChannel,
    success,
  },
  onDone: 'fundLedger',
};

type LedgerExists = Init & { ledgerChannelID: string };
const fundLedger = {
  invoke: {
    src: 'directFunding',
    onDone: 'fundTarget',
  },
};

const fundTarget = {
  invoke: {
    src: 'ledgerUpdate',
    onDone: 'success',
  },
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
  createNullChannel: any;
  directFunding: any;
  ledgerUpdate: any;
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
  const createNullChannelArgs: (ctx: Init) => CreateNullChannelArgs = ({
    targetChannelId: targetChannelID,
  }: Init) => {
    const { channel: targetChannel, outcome } = store.getLatestState(
      targetChannelID
    );
    const channel = {
      ...targetChannel,
      channelNonce: store.getNextNonce(targetChannel.participants),
    };
    return { channel, outcome };
  };
  function directFundingArgs(ctx: LedgerExists): DirectFundingArgs {
    return {
      channelID: ctx.ledgerChannelID,
      minimalOutcome: store.getLatestState(ctx.targetChannelId).outcome,
    };
  }
  function ledgerUpdateArgs({
    ledgerChannelID,
    targetChannelId: targetChannelID,
  }: LedgerExists): LedgerUpdateArgs {
    const amount = store
      .getLatestSupportedAllocation(targetChannelID)
      .map(o => o.amount)
      .reduce(add);
    return {
      channelID: ledgerChannelID,
      targetOutcome: [{ destination: targetChannelID, amount }],
    };
  }

  const services: Services = {
    findLedgerChannelId: async () => ({ type: 'NOT_FOUND' }),
    ledgerUpdate: () => true,
    directFunding: () => true,
    createNullChannel: () => true,
  };

  const options = { services, guards };

  return Machine(config).withConfig(options, context);
};
