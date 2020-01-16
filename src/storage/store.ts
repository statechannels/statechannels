import {
  IStore,
  Constructor as BaseConstructor
} from '@statechannels/wallet-protocols/lib/src/store';

import {Store as BaseStore} from '@statechannels/wallet-protocols/src/store';
import {SignedState} from '@statechannels/wallet-protocols';
import {ChannelStoreEntry} from '@statechannels/wallet-protocols/src/ChannelStoreEntry';
import * as ethAssetHolder from '../eth-asset-holder';
import {getEthAssetHolderContract} from '../utils/contract-utils';

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
    return ethAssetHolder.getHoldings(channelId);
  }
  public onDepositEvent(
    listener: (amount: string, channelId: string, holdings: string) => void
  ): () => void {
    getEthAssetHolderContract().then(contract => {
      contract.on('Deposited', listener);
    });
    return () => {};
  }
  public deposit(channelId: string, amount: string, expectedHeld: string): Promise<void> {
    return ethAssetHolder.deposit(channelId, amount, expectedHeld);
  }
}
