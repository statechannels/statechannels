import { assign } from 'xstate';
import { Balance, checkThat, getEthAllocation } from '../..';
import { HubChoice } from '../../wire-protocol';
import { Init as VirtualFundAsLeafArgs } from '../virtual-fund-as-leaf/protocol';
import { isAllocationOutcome } from '@statechannels/nitro-protocol';
import { store } from '../../temp-store';
const PROTOCOL = 'virtual-funding';
const success = { type: 'final' };

export interface Init {
  targetChannelId: string;
}

const assignChoice = assign((ctx: Init): HubKnown => ({ ...ctx, hubAddress: 'TODO' }));
function sendProposal({ hubAddress, targetChannelId }: HubKnown): HubChoice {
  return {
    type: 'HubChoice',
    hubAddress,
    targetChannelId,
  };
}
function agreement(
  { hubAddress: ourChoice }: HubKnown,
  { hubAddress: theirChoice }: HubChoice
): boolean {
  return ourChoice === theirChoice;
}
const chooseHub = {
  entry: ['assignChoice', sendProposal.name],
  on: {
    PROPOSAL_RECEIVED: {
      target: 'fund',
      cond: agreement.name,
    },
  },
};
type HubKnown = Init & { hubAddress: string };

function virtualFundAsLeafArgs({ targetChannelId, hubAddress }: HubKnown): VirtualFundAsLeafArgs {
  const { channel, outcome } = store.getEntry(targetChannelId).latestState;
  const balances: Balance[] = getEthAllocation(outcome).map(o => ({
    address: o.destination,
    wei: o.amount,
  }));
  const index = store.getIndex(targetChannelId);
  const participantIds = [channel.participants[index], hubAddress];
  const ledgerId = store.findLedgerChannelId(participantIds);
  if (!ledgerId) {
    throw new Error('No connection to hub');
  }

  return {
    balances,
    targetChannelId,
    hubAddress,
    ledgerId,
    index,
  };
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
    chooseHub,
    fund,
    success,
  },
};
