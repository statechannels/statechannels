import { store, ethAllocationOutcome } from '../..';
import { isIndirectFunding } from '../../ChannelStoreEntry';
import { checkThat } from '../../store';
import * as LedgerUpdate from '../ledger-update/protocol';
import { isAllocationOutcome } from '@statechannels/nitro-protocol';

const PROTOCOL = 'ledger-defunding';
const success = { type: 'final' };

export interface Init {
  targetChannelId;
}

function ledgerUpdateArgs({ targetChannelId }: Init): LedgerUpdate.Init {
  const { ledgerId } = checkThat(store.getEntry(targetChannelId).funding, isIndirectFunding);
  const { outcome } = store.getEntry(ledgerId).latestSupportedState;
  const { outcome: concludedOutcome } = store.getEntry(targetChannelId).latestSupportedState;
  const targetAllocation = checkThat(outcome[0], isAllocationOutcome)
    .allocation.filter(item => item.destination !== targetChannelId)
    .concat(checkThat(concludedOutcome[0], isAllocationOutcome).allocation);
  return {
    channelId: ledgerId,
    targetOutcome: ethAllocationOutcome(targetAllocation),
  };
}
const defundTarget = {
  invoke: {
    src: 'ledgerUpdate',
    data: ledgerUpdateArgs.name,
    onDone: 'success',
  },
};

export const config = {
  key: PROTOCOL,
  initial: 'concludeTarget',
  states: {
    defundTarget,
    success,
  },
};
