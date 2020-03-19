import {ChannelConstants, State, SignedState} from './types';
import {Funding} from './memory-store';
export interface ChannelStoreEntry {
  readonly channelId: string;
  readonly myIndex: number;
  readonly latest: State;
  readonly isSupported: boolean;
  readonly isSupportedByMe: boolean;
  readonly isFinalized: boolean;
  readonly latestState: State;
  readonly supported: State;
  readonly support: SignedState[];
  readonly latestSupportedByMe: State;
  readonly channelConstants: ChannelConstants;
  readonly funding?: Funding;
  readonly states: State[];
  readonly applicationSite?: string;
}
