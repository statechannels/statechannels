import { assign } from 'xstate';
import {
  add,
  AllocationItem,
  Balance,
  Channel,
  getChannelID,
  Guarantee,
  store,
} from '../../';
import { saveConfig } from '../../utils';
import { Init as CreateNullChannelArgs } from '../create-null-channel/protocol';
import { Init as SupportStateArgs } from '../support-state/protocol';

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

export const assignChannels = assign(
  (init: Init): ChannelsKnown => {
    const { hubAddress, targetChannelId, index } = init;
    const participants = store
      .getEntry(targetChannelId)
      .participants.map(p => p.destination);
    const jointParticipants = [participants[0], hubAddress, participants[1]];
    const jointChannel: Channel = {
      participants: jointParticipants,
      channelNonce: store.getNextNonce(jointParticipants),
      chainId: 'TODO',
    };

    const guarantorParticipants = [participants[index], hubAddress];
    const guarantorChannel: Channel = {
      participants: guarantorParticipants,
      channelNonce: store.getNextNonce(guarantorParticipants),
      chainId: 'TODO',
    };

    return {
      ...init,
      jointChannel,
      guarantorChannel,
    };
  }
);

export type ChannelsKnown = Init & {
  jointChannel: Channel;
  guarantorChannel: Channel;
};
const total = (balances: Balance[]) => balances.map(b => b.wei).reduce(add);
export function jointChannelArgs({
  balances,
  jointChannel,
}: ChannelsKnown): CreateNullChannelArgs {
  const allocation: (i: Indices) => AllocationItem = i => ({
    destination: balances[i].address,
    amount: balances[i].wei,
  });

  return {
    channel: jointChannel,
    outcome: [
      allocation(Indices.Left),
      { destination: jointChannel.participants[1], amount: total(balances) },
      allocation(Indices.Right),
    ],
  };
}
const createJointChannel = {
  invoke: {
    src: 'createNullChannel',
    data: 'jointChannelArgs',
  },
};

export function guarantorChannelArgs({
  jointChannel,
  index,
}: ChannelsKnown): Guarantee {
  const { participants } = jointChannel;

  return {
    target: getChannelID(jointChannel),
    // Note that index in the joint channel is twice the index in the target channel
    guarantee: [participants[2 * index], participants[1]],
  };
}

const createGuarantorChannel = {
  invoke: {
    src: 'createNullChannel',
    data: 'guarantorChannelArgs',
  },
};

export function fundGuarantorArgs({
  guarantorChannel,
  ledgerId,
  balances,
}: ChannelsKnown): SupportStateArgs {
  const amount = total(balances);
  return {
    channelID: ledgerId,
    outcome: [{ destination: getChannelID(guarantorChannel), amount }],
  };
}
const createChannels = {
  entry: 'assignChannels',
  type: 'parallel',
  states: {
    createGuarantorChannel,
    createJointChannel,
  },
  onDone: 'fundGuarantor',
};

const fundGuarantor = {
  invoke: {
    src: 'supportState',
    data: 'guarantorOutcome',
    onDone: 'fundTarget',
  },
};

const fundTarget = {
  invoke: {
    src: 'supportState',
    data: 'jointOutcome',
    onDone: 'success',
  },
};

// PROTOCOL DEFINITION
const config = {
  key: PROTOCOL,
  initial: 'createChannels',
  states: {
    createChannels,
    fundGuarantor,
    fundTarget,
    success: { type: 'final' },
  },
};

const guards = {};
saveConfig(config, __dirname, { guards });
