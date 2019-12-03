import { Outcome, store } from '../..';
import { isIndirectFunding } from '../../ChannelStoreEntry';
import { shouldBe } from '../../store';
import { saveConfig } from '../../utils';
import * as LedgerUpdate from '../ledger-update/protocol';

const PROTOCOL = 'ledger-defunding';
const success = { type: 'final' };

export interface Init {
  targetChannelId;
}

function ledgerUpdateArgs({ targetChannelId }: Init): LedgerUpdate.Init {
  const { ledgerId } = shouldBe(
    isIndirectFunding,
    store.getEntry(targetChannelId).funding
  );
  const outcome = store.getLatestSupportedAllocation(ledgerId);
  const concludedOutcome = store.getLatestSupportedAllocation(targetChannelId);
  const targetOutcome = outcome
    .filter(item => item.destination !== targetChannelId)
    .concat(concludedOutcome);
  return {
    channelID: ledgerId,
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

const config = {
  key: PROTOCOL,
  initial: 'concludeTarget',
  states: {
    defundTarget,
    success,
  },
};

const guards = {};

saveConfig(config, __dirname, { guards });
