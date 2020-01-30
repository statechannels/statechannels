import { Balance } from '../../types';
import { Init as VirtualFundAsLeafArgs } from '../virtual-fund-as-leaf/protocol';
import { store } from '../../temp-store';
import { getEthAllocation } from '../../calculations';

import { VirtualLeaf } from '..';
const PROTOCOL = 'virtual-funding';
const success = { type: 'final' };

export interface Init {
  targetChannelId: string;
  hubAddress: string;
}

function virtualFundAsLeafArgs({ targetChannelId, hubAddress }: Init): VirtualFundAsLeafArgs {
  const { latestState, ourIndex: index } = store.getEntry(targetChannelId);
  const { channel, outcome } = latestState;
  const balances: Balance[] = getEthAllocation(outcome, store.ethAssetHolderAddress).map(o => ({
    address: o.destination,
    wei: o.amount,
  }));
  const participantIds = [channel.participants[index], hubAddress];
  const ledgerId = store.findLedgerChannelId(participantIds);
  if (!ledgerId) {
    throw new Error('No connection to hub');
  }

  return {
    balances,
    targetChannelId,
    hubAddress,
    index,
  } as VirtualLeaf.Init; // TODO: determine channels
}
const fund = {
  invoke: {
    src: 'virtualFundAsLeaf',
    data: virtualFundAsLeafArgs.name,
  },
};

export const config = {
  key: PROTOCOL,
  initial: 'chooseHub',
  states: {
    fund,
    success,
  },
};
