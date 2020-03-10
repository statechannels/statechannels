import {ChannelConstants, StateVariables, State} from './types';
import {Funding} from './memory-store';
export interface ChannelStoreEntry {
  readonly channelId: string;
  readonly myIndex: number;
  readonly latest: StateVariables;
  readonly isSupported: boolean;
  readonly isSupportedByMe: boolean;
  readonly latestState: State;
  readonly supported: State;
  readonly latestSupportedByMe: State;
  readonly channelConstants: ChannelConstants;
  readonly funding?: Funding;
  readonly states: State[];
}
