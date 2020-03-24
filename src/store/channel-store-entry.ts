import {ChannelConstants, State, SignedState, StateVariables} from './types';
import {Funding} from '.';
import {BigNumber} from 'ethers/utils';

export type ChannelStoredData = {
  stateVariables: Record<string, StateVariables>;
  channelConstants: Omit<ChannelConstants, 'challengeDuration' | 'channelNonce'> & {
    challengeDuration: BigNumber | string;
    channelNonce: BigNumber | string;
  };
  signatures: Record<string, string[] | undefined>;
  funding: Funding | undefined;
  applicationSite: string | undefined;
  myIndex: number;
};
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
  data(): ChannelStoredData;
}
