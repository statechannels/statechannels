import {AppData} from './app-data';

export interface ChannelState {
  channelId: string;
  turnNum: string;
  status: string;
  aUserId: string;
  bUserId: string;
  aDestination: string;
  bDestination: string;
  aBal: string;
  bBal: string;
  appData: AppData;
}
