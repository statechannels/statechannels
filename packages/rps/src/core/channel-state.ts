import {AppData} from './app-data';

export interface ChannelState {
  turnNum: number;
  status: string;
  aUserId: string;
  bUserId: string;
  aDestination: string;
  bDestination: string;
  aBal: number;
  bBal: number;
  appData: AppData;
}
