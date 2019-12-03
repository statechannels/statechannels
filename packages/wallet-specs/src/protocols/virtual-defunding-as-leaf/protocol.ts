import { assign } from 'xstate';
import { store } from '../../';
import { isVirtualFunding } from '../../ChannelStoreEntry';
import { shouldBe } from '../../store';
import { saveConfig } from '../../utils';

const PROTOCOL = 'virtual-defunding-as-leaf';

export interface Init {
  targetChannelId: string;
}

export const assignChannels = assign(
  ({ targetChannelId }: Init): ChannelsSet => {
    const { jointChannelId, guarantorChannelId } = shouldBe(
      isVirtualFunding,
      store.getEntry(targetChannelId).funding
    );

    return {
      targetChannelId,
      jointChannelId,
      guarantorChannelId,
    };
  }
);

export type ChannelsSet = Init & {
  jointChannelId: string;
  guarantorChannelId: string;
};

const defundTarget = {
  entry: ['assignChannels', 'ensureTargetIsConcluded'],
  invoke: {
    src: 'supportState',
    data: 'finalJointChannelState',
    onDone: 'defundGuarantor',
  },
  exit: 'garbageCollectTargetChannel',
};

const defundGuarantor = {
  invoke: {
    src: 'supportState',
    data: 'defundGuarantorInLedger',
    onDone: 'success',
  },
  exit: ['garbageCollectJointChannel', 'garbageCollectGuarantorChannel'],
};

// PROTOCOL DEFINITION
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
