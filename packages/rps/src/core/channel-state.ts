import {AppData} from './app-data';

export type ChannelStatus = 'proposed' | 'opening' | 'running' | 'concluding' | 'closed';

export interface ChannelState {
  channelId: string;
  turnNum: string;
  status: ChannelStatus;
  aUserId: string;
  bUserId: string;
  aDestination: string;
  bDestination: string;
  aBal: string;
  bBal: string;
  appData: AppData;
}
