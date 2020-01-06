import { store } from '../..';
import { isIndirectFunding } from '../../ChannelStoreEntry';
import { checkThat, isAllocation } from '../../store';
import * as LedgerUpdate from '../ledger-update/protocol';

const PROTOCOL = 'ledger-defunding';
const success = { type: 'final' };

export interface Init {
  targetChannelId;
}

function ledgerUpdateArgs({ targetChannelId }: Init): LedgerUpdate.Init {
  const { ledgerId } = checkThat(store.getEntry(targetChannelId).funding, isIndirectFunding);
  const { outcome } = store.getEntry(ledgerId).latestSupportedState;
  const { outcome: concludedOutcome } = store.getEntry(targetChannelId).latestSupportedState;
  const targetOutcome = checkThat(outcome, isAllocation)
    .filter(item => item.destination !== targetChannelId)
    .concat(checkThat(concludedOutcome, isAllocation));
  return {
    channelId: ledgerId,
    targetOutcome,
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
