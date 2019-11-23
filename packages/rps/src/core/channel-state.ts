import { AppData } from './app-data';

export type ChannelStatus = 'proposed' | 'opening' | 'funding' | 'running' | 'closing' | 'closed';

export interface ChannelState<T = AppData> {
  channelId: string;
  turnNum: string;
  status: ChannelStatus;
  aUserId: string;
  bUserId: string;
  aDestination: string;
  bDestination: string;
  aBal: string;
  bBal: string;
  appData: T;
}
