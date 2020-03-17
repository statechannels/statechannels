import {MemoryStore, Funding} from '../../store/memory-store';
import {MemoryChannelStoreEntry} from '../../store/memory-channel-storage';
import {SignedState} from '../../store/types';
import {hashState} from '../../store/state-utils';
import {Guid} from 'guid-typescript';

export class TestStore extends MemoryStore {
  public _channelLocks: Record<string, Guid>;
  public createEntry(
    signedState: SignedState,
    opts?: {
      funding?: Funding;
      applicationSite?: string;
    }
  ): MemoryChannelStoreEntry {
    const myIndex = signedState.participants
      .map(p => p.signingAddress)
      .findIndex(a => a === this.getAddress());
    const {funding, applicationSite} = opts || {};
    const entry = new MemoryChannelStoreEntry(
      signedState,
      myIndex,
      {[hashState(signedState)]: signedState},
      {[hashState(signedState)]: signedState.signatures},
      funding,
      applicationSite
    );
    this._channels[entry.channelId] = entry;

    return entry;
  }
}
