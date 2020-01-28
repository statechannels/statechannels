import { assign } from 'xstate';
import { Guarantee } from '@statechannels/nitro-protocol';

import { Channel, getChannelId } from '../../';
import { add } from '../../mathOps';
import { Balance } from '../../types';
import { ethAllocationOutcome, ethGuaranteeOutcome } from '../../calculations';
import { Store } from '../../store';
import { CHAIN_ID } from '../../constants';
import { connectToStore } from '../../machine-utils';

import { CreateNullChannel } from '..';

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

type ChannelsKnown = Init & {
  jointChannel: Channel;
  guarantorChannel: Channel;
};
const total = (balances: Balance[]) => balances.map(b => b.wei).reduce(add);
function jointChannelArgs({ jointChannel }: ChannelsKnown): CreateNullChannel.Init {
  return { channel: jointChannel };
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

function fundGuarantorArgs({ guarantorChannel, ledgerId, balances }: ChannelsKnown) {
  const amount = total(balances);

  return {
    channelId: ledgerId,
    outcome: ethAllocationOutcome(
      [{ destination: getChannelId(guarantorChannel), amount }],
      'TODO'
    ),
  };
}
const fundGuarantor = {
  invoke: {
    src: 'supportState',
    data: fundGuarantorArgs,
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

const options = (store: Store) => ({ actions: { assignChannels: assignChannels(store) } });

export const machine = connectToStore(config, options);
