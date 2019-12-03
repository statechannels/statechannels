import { add, Allocation, Channel, subtract } from '../..';
import { isAllocation, shouldBe, store } from '../../store';
import { saveConfig } from '../../utils';
import * as ConcludeChannel from '../conclude-channel/protocol';
import * as CreateNullChannel from '../create-null-channel/protocol';
import * as LedgerUpdate from '../ledger-update/protocol';

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
  newOutcome: Allocation;
  participantMapping: Record<string, string>;
}

function replacementChannelArgs({
  ledgerId,
  newOutcome,
  participantMapping,
}: Init): CreateNullChannel.Init {
  const { channel, outcome } = store.getLatestConsensus(ledgerId).state;
  const newParticipants = channel.participants
    .filter(p => newOutcome.find(allocation => allocation.destination === p))
    .map(p => participantMapping[p]);
  const newChannel: Channel = {
    chainId: channel.chainId,
    participants: newParticipants,
    channelNonce: store.getNextNonce(newParticipants),
  };

  const newChannelOutcome: Allocation = shouldBe(isAllocation, outcome).map(
    ({ destination, amount }) => ({
      destination: participantMapping[destination],
      amount: subtract(outcome[destination], newOutcome[destination]),
    })
  );

  return {
    channel: newChannel,
    outcome: newChannelOutcome,
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
  const { state } = store.getLatestConsensus(ledgerId);
  const currentlyAllocated = shouldBe(isAllocation, state.outcome)
    .map(a => a.amount)
    .reduce(add, 0);
  const toBeWithdrawn = newOutcome.map(a => a.amount).reduce(add, 0);
  const targetOutcome = [
    ...newOutcome,
    {
      destination: newChannelId,
      amount: subtract(currentlyAllocated, toBeWithdrawn),
    },
  ];
  return {
    channelID: ledgerId,
    targetOutcome,
  };
}
const updateOldChannelOutcome = {
  invoke: {
    src: 'ledgerUpdate',
    data: concludeOutcome.name,
    onDone: 'concludeOldChannel',
  },
};

function oldChannelId({
  ledgerId: channelID,
}: NewChannelCreated): ConcludeChannel.Init {
  return { channelID };
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

const config = {
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

const guards = {};

saveConfig(config, __dirname, { guards });
