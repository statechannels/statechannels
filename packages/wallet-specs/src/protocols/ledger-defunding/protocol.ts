import { store, ethAllocationOutcome, checkThat, getEthAllocation } from '../..';
import { isIndirectFunding } from '../../ChannelStoreEntry';
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
  const targetAllocation = getEthAllocation(outcome)
    .filter(item => item.destination !== targetChannelId)
    .concat(getEthAllocation(concludedOutcome));
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
