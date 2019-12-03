import { assign } from 'xstate';
import { store } from '../../';
import { isGuarantee } from '../../ChannelStoreEntry';
import { shouldBe } from '../../store';
import { saveConfig } from '../../utils';

const PROTOCOL = 'virtual-defunding-as-hub';

export interface Init {
  jointChannelId: string;
}

type ChannelsSet = Init & {
  guarantorChannelIds;
};

export const assignChannels = assign(
  ({ jointChannelId }: Init): ChannelsSet => {
    const { guarantorChannelIds } = shouldBe(
      isGuarantee,
      store.getEntry(jointChannelId).funding
    );

    return { jointChannelId, guarantorChannelIds };
  }
);

const defundGuarantors = {
  type: 'parallel',
  states: {
    defundLeft: {
      invoke: {
        src: 'supportState',
        data: 'defundLeftGuarantor',
      },
      exit: 'garbageCollectLeftGuarantor',
    },
    defundRight: {
      invoke: {
        src: 'supportState',
        data: 'defundRightGuarantor',
      },
      exit: 'garbageCollectRightGuarantor',
    },
  },
  exit: 'garbageCollectJointChannel',
  onDone: 'success',
};

// PROTOCOL DEFINITION
const config = {
  key: PROTOCOL,
  initial: 'defundGuarantors',
  states: {
    defundGuarantors,
    success: { type: 'final' },
  },
};

const guards = {};
saveConfig(config, __dirname, { guards });
