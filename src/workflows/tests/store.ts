import {MemoryChannelStoreEntry} from '../../store/memory-channel-storage';
import {SignedState} from '../../store/types';
import {hashState} from '../../store/state-utils';
import {Guid} from 'guid-typescript';
import {XstateStore, Funding, Store} from '../../store';

export class TestStore extends XstateStore implements Store {
  public _channelLocks: Record<string, Guid>;
  public async createEntry(
    signedState: SignedState,
    opts?: {
      funding?: Funding;
      applicationSite?: string;
    }
  ): Promise<MemoryChannelStoreEntry> {
    const address = await this.getAddress();
    const myIndex = signedState.participants
      .map(p => p.signingAddress)
      .findIndex(a => a === address);
    const {funding, applicationSite} = opts || {};
    const entry = new MemoryChannelStoreEntry(
      signedState,
      myIndex,
      {[hashState(signedState)]: signedState},
      {[hashState(signedState)]: signedState.signatures},
      funding,
      applicationSite
    );
    await this.backend.setChannel(entry.channelId, entry);

    return entry;
  }
  async setLedgerByEntry(entry: MemoryChannelStoreEntry) {
    // This is not on the Store interface itself -- it is useful to set up a test store
    const {channelId} = entry;
    this.backend.setChannel(channelId, entry);
    const address = await this.getAddress();
    const peerId = entry.participants.find(p => p.signingAddress !== address);
    if (!peerId) throw 'No peer';
    this.backend.setLedger(peerId?.participantId, channelId);
  }
}
