import {IStore} from '@statechannels/wallet-protocols/lib/src/store';

import jrs from 'jsonrpc-lite';
import {dispatchChannelUpdatedMessage} from '../messaging';
import {Store as BaseStore} from '@statechannels/wallet-protocols/src/store';
import {SignedState} from '@statechannels/wallet-protocols';
import {ChannelStoreEntry} from '@statechannels/wallet-protocols/src/ChannelStoreEntry';

export class Store extends BaseStore implements IStore {
  protected updateOrCreateEntry(channelId: string, states: SignedState[]): ChannelStoreEntry {
    const entry = super.updateOrCreateEntry(channelId, states);
    dispatchChannelUpdatedMessage(channelId, this);
    return entry;
  }

  protected sendMessage(message: any, recipients: string[]) {
    recipients.forEach(recipient => {
      const notification = jrs.notification('MessageQueued', {
        recipient,
        sender: 'TODO',
        data: message
      });
      window.parent.postMessage(notification, '*');
    });
  }
}
