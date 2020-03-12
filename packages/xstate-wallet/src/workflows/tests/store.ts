import {MemoryStore, Funding} from '../../store/memory-store';
import {MemoryChannelStoreEntry} from '../../store/memory-channel-storage';
import {SignedState} from '../../store/types';
import {hashState} from '../../store/state-utils';

export class TestStore extends MemoryStore {
  public createEntry(signedState: SignedState, funding?: Funding): MemoryChannelStoreEntry {
    const myIndex = signedState.participants
      .map(p => p.signingAddress)
      .findIndex(a => a === this.getAddress());
    const entry = new MemoryChannelStoreEntry(
      signedState,
      myIndex,
      {[hashState(signedState)]: signedState},
      {[hashState(signedState)]: signedState.signatures},
      funding
    );
    this._channels[entry.channelId] = entry;

    return entry;
  }
}
