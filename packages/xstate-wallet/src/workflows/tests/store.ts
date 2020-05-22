import {ChannelStoreEntry} from '../../store/channel-store-entry';
import {SignedState} from '../../store/types';
import {hashState} from '../../store/state-utils';
import {Guid} from 'guid-typescript';
import {Store, Funding} from '../../store';
import {SigningKey} from '@ethersproject/signing-key';

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
    const {publicKey} = new SigningKey(pk);
    await this.backend.setPrivateKey(publicKey, pk);
  }
}
