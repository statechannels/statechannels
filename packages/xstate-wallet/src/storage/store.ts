import {
  IStore,
  Constructor as BaseConstructor
} from '@statechannels/wallet-protocols/lib/src/store';

import {Store as BaseStore} from '@statechannels/wallet-protocols/src/store';
import {SignedState} from '@statechannels/wallet-protocols';
import {ChannelStoreEntry} from '@statechannels/wallet-protocols/src/ChannelStoreEntry';

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

  protected updateEntry(channelId: string, states: SignedState[]): ChannelStoreEntry {
    const entry = super.updateEntry(channelId, states);
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
}
