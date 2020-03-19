import {MemoryChannelStoreEntry} from '../../store/memory-channel-storage';
import {SignedState} from '../../store/types';
import {hashState} from '../../store/state-utils';
import {Guid} from 'guid-typescript';
import {XstateStore, Funding} from '../../store';

export class TestStore extends XstateStore {
  public _channelLocks: Record<string, Guid>;
  public async createEntry(
    signedState: SignedState,
    funding?: Funding
  ): Promise<MemoryChannelStoreEntry> {
    const address = await this.getAddress();
    const myIndex = signedState.participants
      .map(p => p.signingAddress)
      .findIndex(a => a === address);
    const entry = new MemoryChannelStoreEntry(
      signedState,
      myIndex,
      {[hashState(signedState)]: signedState},
      {[hashState(signedState)]: signedState.signatures},
      funding
    );
    await this.backend.setChannel(entry.channelId, entry);

    return entry;
  }
  setLedgerByEntry(entry) {
    /* TODO: Implement this */
  }
}
