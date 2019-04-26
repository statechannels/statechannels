import * as states from './state';
import { ProtocolStateWithSharedData } from '../../';
import { SharedData } from '../../../state';

export function initialize(
  channelId: string,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.WaitForApproval> {
  return { protocolState: states.waitForApproval({ channelId }), sharedData };
}
