import {Guid} from 'guid-typescript';
import {Wallet} from 'ethers';
import {hashState, SignedState, Funding} from '@statechannels/wallet-core';

import {ChannelStoreEntry} from './store/channel-store-entry';
import {Store} from './store';

export class TestStore extends Store {
  public _channelLocks: Record<string, Guid>;
  public get dbBackend() {
    return this.backend;
  }
  public async createEntry(
    signedState: SignedState,
    opts?: {
      funding?: Funding;
      applicationDomain?: string;
      hasChallenge?: boolean;
    }
  ): Promise<ChannelStoreEntry> {
    const address = await this.getAddress();
    const myIndex = signedState.participants
      .map(p => p.signingAddress)
      .findIndex(a => a === address);
    const {funding, applicationDomain} = opts || {};
    const stateHash = hashState(signedState);
    const entry = new ChannelStoreEntry({
      channelConstants: signedState,
      myIndex,
      stateVariables: [{...signedState, stateHash}],
      funding,
      applicationDomain
    });
    await this.backend.setChannel(entry.channelId, entry.data());

    return entry;
  }

  async setLedgerByEntry(entry: ChannelStoreEntry) {
    // This is not on the Store interface itself -- it is useful to set up a test store
    const {channelId} = entry;
    this.backend.setChannel(channelId, entry.data());
    const address = await this.getAddress();
    const peerId = entry.participants.find(p => p.signingAddress !== address);
    if (!peerId) throw 'No peer';
    this.backend.setLedger(peerId?.participantId, channelId);
  }

  async setPrivateKey(pk: string) {
    const {address} = new Wallet(pk);
    await this.backend.setPrivateKey(address, pk);
  }
}
