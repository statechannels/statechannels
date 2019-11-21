import { AppData } from './app-data';
import { BigNumber } from 'ethers/utils';

export interface ChannelState {
  channelId: string;
  turnNum: BigNumber;
  status: string;
  aUserId: string;
  bUserId: string;
  aDestination: string;
  bDestination: string;
  aBal: string;
  bBal: string;
  appData: AppData;
}
