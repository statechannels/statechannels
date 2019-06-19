import * as states from './states';
import { SharedData } from '../../state';
import { ProtocolStateWithSharedData } from '..';
import { CommitmentType } from '../../../domain';
import { getChannel } from '../../channel-store';

type ReturnVal = ProtocolStateWithSharedData<states.AdvanceChannelState>;
type Storage = SharedData;

export function initialize(
  channelId: string,
  sharedData: Storage,
  commitmentType: CommitmentType,
  startingOpts?: any,
): ReturnVal {
  const channel = getChannel(sharedData.channelStore, channelId);
  if (startingOpts) {
    return { protocolState: states.notSafeToSend(startingOpts), sharedData };
  }
  if (!channel) {
    throw new Error(`Could not find existing application channel ${channelId}`);
  }

  const processId = `advance-${channelId}-${commitmentType}`;
  const { ourIndex } = channel;
  return { protocolState: states.notSafeToSend({ processId, channelId, ourIndex }), sharedData };
}
