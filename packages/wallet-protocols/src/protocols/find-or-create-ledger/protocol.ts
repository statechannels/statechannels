import { assign, DoneInvokeEvent } from 'xstate';

import { Participant } from '../../store';
import { connectToStore } from '../../machine-utils';

import { CreateNullChannel } from '..';

export interface Init {
  participants: Participant[];
}

const assignLedgerChannelId = assign(
  (ctx: Init, event: DoneInvokeEvent<{ channelId: string }>) => ({
    ...ctx,
    ledgerChannelId: event.data.channelId,
  })
);

/*
My wallet's rule is to have at most one (directly funded) ledger channel open with any given peer.
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
type LedgerExists = Init & { ledgerChannelId: string };

const config = {
  initial: 'lookForExistingChannel',
  states: {
    lookForExistingChannel,
    determineLedgerChannel,
    createNewLedger,
    success: {
      type: 'final' as 'final',
      data: ({ ledgerChannelId }: LedgerExists) => ledgerChannelId,
    },
  },
};

export const machine = connectToStore(config, () => {});
