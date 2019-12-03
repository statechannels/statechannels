import { assign } from 'xstate';
import { Allocation, nextState, State, store } from '../../';
import { isIndirectFunding, isVirtualFunding } from '../../ChannelStoreEntry';
import { isAllocation, shouldBe } from '../../store';
import { saveConfig } from '../../utils';

import * as LedgerUpdate from '../ledger-update/protocol';
const PROTOCOL = 'virtual-defunding-as-leaf';

export interface Init {
  targetChannelId: string;
  index: 0 | 1;
}

export const assignChannels = assign(
  ({ targetChannelId, index }: Init): ChannelsSet => {
    const { jointChannelId, guarantorChannelId } = shouldBe(
      isVirtualFunding,
      store.getEntry(targetChannelId).funding
    );

    const { ledgerId: hubLedgerId } = shouldBe(
      isIndirectFunding,
      store.getEntry(guarantorChannelId).funding
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
  const { state: targetChannelState } = store.getLatestSupport(
    targetChannelId
  )[0];
  if (!targetChannelState.isFinal) {
    throw new Error('Target channel not finalized');
  }
  const { state: jointState } = store.getLatestConsensus(jointChannelId);

  const jointOutcome = shouldBe(isAllocation, jointState.outcome);
  const targetChannelIdx = jointOutcome.findIndex(
    a => a.destination === targetChannelId
  );
  const targetOutcome = [
    ...shouldBe(isAllocation, targetChannelState.outcome),
    ...jointOutcome.splice(targetChannelIdx),
  ];
  return {
    channelID: jointChannelId,
    targetOutcome,
  };
}
const defundTarget = {
  entry: 'assignChannels',
  invoke: {
    src: 'supportState',
    data: finalJointChannelUpdate.name,
    onDone: 'defundGuarantor',
  },
  exit: 'garbageCollectTargetChannel',
};

function defundGuarantorInLedger({
  hubLedgerId,
  jointChannelId,
  index,
}: ChannelsSet): LedgerUpdate.Init {
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

  const jointOutcome = store.getLatestSupportedAllocation(jointChannelId);

  const targetOutcome: Allocation = [
    {
      destination: jointOutcome[2 * index].destination,
      amount: jointOutcome[2 * index].amount,
    },
    {
      destination: jointOutcome[1].destination,
      amount: jointOutcome[2 * (1 - index)].amount,
    },
  ];
  return {
    channelID: hubLedgerId,
    targetOutcome,
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

const config = {
  key: PROTOCOL,
  initial: 'defundTarget',
  states: {
    defundTarget,
    defundGuarantor,
    success: { type: 'final' },
  },
};

const guards = {};
saveConfig(config, __dirname, { guards });
