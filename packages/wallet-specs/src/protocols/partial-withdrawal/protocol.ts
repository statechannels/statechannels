import { isAllocationOutcome, Allocation, Outcome } from '@statechannels/nitro-protocol';

import { add, Channel, subtract, ethAllocationOutcome, checkThat, getEthAllocation } from '../..';
import * as ConcludeChannel from '../conclude-channel/protocol';
import * as CreateNullChannel from '../create-null-channel/protocol';
import * as LedgerUpdate from '../ledger-update/protocol';
import { store } from '../../temp-store';
const PROTOCOL = 'partial-withdrawal';
const success = { type: 'final' };

/*
participantMapping allows participants to change their signing keys in the new channel.

This protocol allows for more than one participant to withdraw from the channel.
This may be useful, for instance, if a customer of the hub decides to lower their "channel rent",
and the hub responds accordingly by lowering their stake.
This would have to be negotiated in a different, undetermined protocol.
*/
interface Init {
  ledgerId: string;
  newOutcome: Outcome;
  participantMapping: Record<string, string>;
}

function replacementChannelArgs({
  ledgerId,
  newOutcome,
  participantMapping,
}: Init): CreateNullChannel.Init {
  const { channel, outcome } = store.getEntry(ledgerId).latestSupportedState;
  const newParticipants = channel.participants
    .filter(p => getEthAllocation(newOutcome).find(allocation => allocation.destination === p))
    .map(p => participantMapping[p]);
  const newChannel: Channel = {
    chainId: channel.chainId,
    participants: newParticipants,
    channelNonce: store.getNextNonce(newParticipants),
  };

  const newChannelAllocation: Allocation = getEthAllocation(outcome).map(
    ({ destination, amount }) => ({
      destination: participantMapping[destination],
      amount: subtract(outcome[destination], newOutcome[destination]),
    })
  );

  return {
    channel: newChannel,
  };
}
const createReplacement = {
  entry: 'assignNewChannelId',
  invoke: {
    src: 'createNullChannel',
    data: replacementChannelArgs.name,
    onDone: 'updateOldChannelOutcome',
  },
};
type NewChannelCreated = Init & { newChannelId: string };

export function concludeOutcome({
  ledgerId,
  newOutcome,
  newChannelId,
}: NewChannelCreated): LedgerUpdate.Init {
  const state = store.getEntry(ledgerId).latestSupportedState;
  const currentlyAllocated = getEthAllocation(state.outcome)
    .map(a => a.amount)
    .reduce(add, 0);
  const toBeWithdrawn = getEthAllocation(newOutcome)
    .map(a => a.amount)
    .reduce(add, 0);
  const targetAllocation = [
    ...getEthAllocation(newOutcome),
    {
      destination: newChannelId,
      amount: subtract(currentlyAllocated, toBeWithdrawn),
    },
  ];
  return {
    channelId: ledgerId,
    targetOutcome: ethAllocationOutcome(targetAllocation),
  };
}
const updateOldChannelOutcome = {
  invoke: {
    src: 'ledgerUpdate',
    data: concludeOutcome.name,
    onDone: 'concludeOldChannel',
  },
};

function oldChannelId({ ledgerId: channelId }: NewChannelCreated): ConcludeChannel.Init {
  return { channelId };
}
const concludeOldChannel = {
  invoke: {
    src: 'concludeChannel',
    data: oldChannelId.name,
    onDone: 'transfer',
  },
};

const transfer = {
  invoke: {
    src: 'transferAll',
    data: oldChannelId.name,
    onDone: 'success',
  },
};

export const config = {
  key: PROTOCOL,
  initial: 'createReplacement',
  states: {
    createReplacement,
    updateOldChannelOutcome,
    concludeOldChannel,
    transfer,
    success,
  },
};
