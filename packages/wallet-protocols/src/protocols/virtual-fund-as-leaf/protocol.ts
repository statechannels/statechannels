import { assign } from 'xstate';
import { Guarantee, Allocation, Outcome, AllocationItem } from '@statechannels/nitro-protocol';

import { Channel, getChannelId } from '../../';
import { add } from '../../mathOps';
import { Balance } from '../../types';
import {
  allocateToTarget,
  ethAllocationOutcome,
  ethGuaranteeOutcome,
  getEthAllocation,
} from '../../calculations';
import { Store } from '../../store';
import { CHAIN_ID } from '../../constants';
import { connectToStore } from '../../machine-utils';

import { CreateNullChannel, SupportState } from '..';

const PROTOCOL = 'virtual-funding-as-leaf';

enum Indices {
  Left = 0,
  Right = 1,
}

export interface Init {
  balances: Balance[];
  ledgerId: string;
  targetChannelId: string;
  hubAddress: string;
  index: Indices.Left | Indices.Right;
}

const allocationItem = (balance: Balance): AllocationItem => ({
  destination: balance.address,
  amount: balance.wei,
});
type ChannelsKnown = Init & {
  jointChannel: Channel;
  guarantorChannel: Channel;
};
function jointChannelArgs({
  jointChannel,
  balances,
  hubAddress,
}: ChannelsKnown): CreateNullChannel.Init {
  const total = balances.map(b => b.wei).reduce(add);
  const allocation = [
    allocationItem(balances[0]),
    { destination: hubAddress, amount: total },
    allocationItem(balances[1]),
  ];

  return { channel: jointChannel, outcome: ethAllocationOutcome(allocation, 'TODO') };
}
const createJointChannel = {
  invoke: {
    src: 'createNullChannel',
    data: jointChannelArgs,
  },
};

function guarantorChannelArgs({
  jointChannel,
  index,
  guarantorChannel,
}: ChannelsKnown): CreateNullChannel.Init {
  const { participants } = jointChannel;

  const guarantee: Guarantee = {
    targetChannelId: getChannelId(jointChannel),
    // Note that index in the joint channel is twice the index in the target channel
    destinations: [participants[2 * index], participants[1]],
  };

  return { channel: guarantorChannel, outcome: ethGuaranteeOutcome(guarantee, 'TODO') };
}
const createGuarantorChannel = {
  invoke: {
    src: 'createNullChannel',
    data: guarantorChannelArgs,
  },
};

const createChannels = {
  entry: 'assignChannels',
  type: 'parallel' as 'parallel',
  states: {
    createGuarantorChannel,
    createJointChannel,
  },
  onDone: 'fundGuarantor',
};

function fundGuarantorArgs(store: Store) {
  return async ({
    guarantorChannel,
    ledgerId,
    balances,
  }: ChannelsKnown): Promise<SupportState.Init> => {
    const targetAllocation: Allocation = balances.map(b => ({
      destination: b.address,
      amount: b.wei,
    }));
    const { latestSupportedState } = await store.getEntry(ledgerId);
    const ledgerAllocation = getEthAllocation(latestSupportedState.outcome, 'TODO');
    const targetChannelId = getChannelId(guarantorChannel);

    return {
      state: {
        ...latestSupportedState,
        turnNum: latestSupportedState.turnNum + 1,
        outcome: allocateToTarget(
          targetAllocation,
          ledgerAllocation,
          targetChannelId,
          store.ethAssetHolderAddress
        ),
      },
    };
  };
}
const fundGuarantor = {
  invoke: {
    src: 'supportState',
    onDone: 'fundTarget',
  },
};

const fundTarget = {
  invoke: {
    src: 'supportState',
    onDone: 'success',
  },
};

// PROTOCOL DEFINITION
export const config = {
  key: PROTOCOL,
  initial: 'createChannels',
  states: {
    createChannels,
    fundGuarantor,
    fundTarget,
    success: { type: 'final' as 'final' },
  },
};
const assignChannels = (store: Store) =>
  assign(
    (init: Init): ChannelsKnown => {
      const { hubAddress, targetChannelId, index } = init;
      const participants = store.getEntry(targetChannelId).participants.map(p => p.destination);
      const jointParticipants = [participants[0], hubAddress, participants[1]];
      const jointChannel: Channel = {
        participants: jointParticipants,
        channelNonce: store.getNextNonce(jointParticipants),
        chainId: CHAIN_ID,
      };

      const guarantorParticipants = [participants[index], hubAddress];
      const guarantorChannel: Channel = {
        participants: guarantorParticipants,
        channelNonce: store.getNextNonce(guarantorParticipants),
        chainId: CHAIN_ID,
      };

      return {
        ...init,
        jointChannel,
        guarantorChannel,
      };
    }
  );

const options = (store: Store) => ({
  actions: { assignChannels: assignChannels(store) },
  services: fundGuarantorArgs(store),
  createNullChannel: CreateNullChannel.machine(store),
  supportState: SupportState.machine(store),
});

export const machine = connectToStore(config, options);
