import { assign } from 'xstate';
import { store, Without, ethAllocationOutcome } from '../../';
import { isIndirectFunding, isVirtualFunding } from '../../ChannelStoreEntry';
import { checkThat } from '../../store';

import * as LedgerUpdate from '../ledger-update/protocol';
import { isAllocationOutcome, Allocation } from '@statechannels/nitro-protocol';
const PROTOCOL = 'virtual-defunding-as-leaf';

export interface Init {
  targetChannelId: string;
  index: 0 | 1;
}

export const assignChannels = assign(
  ({ targetChannelId, index }: Init): ChannelsSet => {
    const { jointChannelId, guarantorChannelId } = checkThat(
      store.getEntry(targetChannelId).funding,
      isVirtualFunding
    );

    const { ledgerId: hubLedgerId } = checkThat(
      store.getEntry(guarantorChannelId).funding,
      isIndirectFunding
    );

    return {
      targetChannelId,
      index,
      jointChannelId,
      guarantorChannelId,
      hubLedgerId,
    };
  }
);

export type ChannelsSet = Init & {
  jointChannelId: string;
  guarantorChannelId: string;
  hubLedgerId: string;
};

function finalJointChannelUpdate({
  jointChannelId,
  targetChannelId,
}: ChannelsSet): LedgerUpdate.Init {
  const targetChannelState = store.getEntry(targetChannelId).latestSupportedState;
  if (!targetChannelState || !targetChannelState.isFinal) {
    throw new Error('Target channel not finalized');
  }
  const jointState = store.getEntry(jointChannelId).latestSupportedState;

  const jointOutcome = checkThat(jointState.outcome[0], isAllocationOutcome);
  const targetChannelIdx = jointOutcome.allocation.findIndex(
    a => a.destination === targetChannelId
  );
  const targetAllocation: Allocation = [
    ...checkThat(targetChannelState.outcome[0], isAllocationOutcome).allocation,
    ...jointOutcome.allocation.splice(targetChannelIdx),
  ];
  return {
    channelId: jointChannelId,
    targetOutcome: ethAllocationOutcome(targetAllocation),
  };
}
const defundTarget = {
  entry: 'assignChannels',
  invoke: {
    src: 'supportState',
    data: finalJointChannelUpdate.name,
    onDone: 'defundGuarantor',
  },
  exit: 'garbageCollecttargetChannel',
};

// Without is used so that defundGuarantorInLedger can be used by the hub as well
export function defundGuarantorInLedger({
  hubLedgerId,
  jointChannelId,
  index,
}: Without<ChannelsSet, 'targetChannelId'>): LedgerUpdate.Init {
  /*
  Case:
    - jointOutcome == [(A, a), (H, a+b), (B, b)]
    - index == 0
  Goal: targetOutcome == [(A, a), (H, b)]

  Case:
    - jointOutcome == [(A, a), (H, a+b), (B, b)]
    - index == 1
  Goal: targetOutcome == [(B, b), (H, a)]
  */

  const { outcome: jointOutcome } = store.getEntry(jointChannelId).latestSupportedState;
  const jointAllocation = checkThat(jointOutcome[0], isAllocationOutcome).allocation;

  const targetAllocation: Allocation = [
    {
      destination: jointAllocation[2 * index].destination,
      amount: jointAllocation[2 * index].amount,
    },
    {
      destination: jointAllocation[1].destination,
      amount: jointAllocation[2 * (1 - index)].amount,
    },
  ];
  return {
    channelId: hubLedgerId,
    targetOutcome: ethAllocationOutcome(targetAllocation),
  };
}
const defundGuarantor = {
  invoke: {
    src: 'supportState',
    data: defundGuarantorInLedger.name,
    onDone: 'success',
  },
  exit: ['garbageCollectJointChannel', 'garbageCollectGuarantorChannel'],
};

export const config = {
  key: PROTOCOL,
  initial: 'defundTarget',
  states: {
    defundTarget,
    defundGuarantor,
    success: { type: 'final' },
  },
};
