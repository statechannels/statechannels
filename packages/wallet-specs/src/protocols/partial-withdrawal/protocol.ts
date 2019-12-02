import { Allocation } from '../..';
import { store } from '../../store';
import { saveConfig } from '../../utils';
import * as ConcludeChannel from '../conclude-channel/protocol';
import * as CreateNullChannel from '../create-null-channel/protocol';
import * as LedgerUpdate from '../ledger-update/protocol';

const PROTOCOL = 'partial-withdrawal';
const success = { type: 'final' };

interface Init {
  ledgerId: string;
  newOutcome: Allocation;
  participantMapping: Record<string, string>;
}

function replacementChannelArgs({ ledgerId }: Init): CreateNullChannel.Init {
  // TODO: Properly compute new outcome and channel
  const { channel: newChannel, outcome } = store.getLatestState(ledgerId);
  return {
    channel: newChannel,
    outcome,
  };
}
const createReplacement = {
  entry: 'assignNewChannelId',
  invoke: {
    src: 'createNullChannel',
    data: replacementChannelArgs.name,
    onDone: 'updateOutcome',
  },
};
type NewChannelCreated = Init & { newChannelId: string };

export function newOutcome({ ledgerId }: NewChannelCreated): LedgerUpdate.Init {
  const { state } = store.getLatestConsensus(ledgerId);
  const targetOutcome = state.outcome; // TODO: update
  return {
    channelID: ledgerId,
    targetOutcome,
    currentTurnNum: state.turnNum,
  };
}
const updateOutcome = {
  invoke: {
    src: 'ledgerUpdate',
    data: newOutcome.name,
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
    updateOutcome,
    concludeOldChannel,
    transfer,
    success,
  },
};

const guards = {};

saveConfig(config, __dirname, { guards });
