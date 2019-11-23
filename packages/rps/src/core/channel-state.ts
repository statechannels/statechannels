import { AppData, RoundProposed, Start, RoundAccepted, Reveal } from './app-data';

export type ChannelStatus = 'proposed' | 'opening' | 'funding' | 'running' | 'closing' | 'closed';

export interface ChannelStateVariant<T = AppData> {
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

export type ChannelState =
  | ChannelStateVariant<Start>
  | ChannelStateVariant<RoundProposed>
  | ChannelStateVariant<RoundAccepted>
  | ChannelStateVariant<Reveal>;
