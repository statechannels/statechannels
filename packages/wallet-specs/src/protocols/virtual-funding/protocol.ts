import { assign } from 'xstate';
import { Balance, store } from '../..';
import { checkThat, isAllocation } from '../../store';
import { HubChoice } from '../../wire-protocol';
import { Init as VirtualFundAsLeafArgs } from '../virtual-fund-as-leaf/protocol';

const PROTOCOL = 'virtual-funding';
const success = { type: 'final' };

export interface Init {
  targetChannelId: string;
}

const assignChoice = assign(
  (ctx: Init): HubKnown => ({ ...ctx, hubAddress: 'TODO' })
);
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

function virtualFundAsLeafArgs({
  targetChannelId,
  hubAddress,
}: HubKnown): VirtualFundAsLeafArgs {
  const { channel, outcome } = store.getLatestState(targetChannelId);
  const balances: Balance[] = checkThat(outcome, isAllocation).map(o => ({
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
