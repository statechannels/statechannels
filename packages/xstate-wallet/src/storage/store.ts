import {
  IStore,
  Constructor as BaseConstructor
} from '@statechannels/wallet-protocols/lib/src/store';

import {Store as BaseStore} from '@statechannels/wallet-protocols/src/store';
import {SignedState} from '@statechannels/wallet-protocols';
import {ChannelStoreEntry} from '@statechannels/wallet-protocols/src/ChannelStoreEntry';
import * as contract from '../contract';

type Constructor = BaseConstructor &
  Partial<{
    channelUpdateListener: (channelId: string, channelStoreEntry: ChannelStoreEntry) => void;
  }> & {messageSender: (recipient: string, message: any) => void};

export class Store extends BaseStore implements IStore {
  private _channelUpdateListener:
    | ((channelId: string, channelStoreEntry: ChannelStoreEntry) => void)
    | undefined;
  private _messageSender: (recipient: string, message: any) => void;

  constructor(args: Constructor) {
    super(args);
    this._channelUpdateListener = args?.channelUpdateListener;
    this._messageSender = args.messageSender;
  }

  protected updateOrCreateEntry(channelId: string, states: SignedState[]): ChannelStoreEntry {
    const entry = super.updateOrCreateEntry(channelId, states);
    if (this._channelUpdateListener) {
      this._channelUpdateListener(channelId, entry);
    }
    return entry;
  }

  protected sendMessage(message: any, recipients: string[]) {
    recipients.forEach(recipient => {
      this._messageSender(recipient, message);
    });
  }
  public getHoldings(channelId: string): Promise<string> {
    return contract.getHoldings(channelId);
  }
}
