import { add, Channel, gt } from '.';

export interface ChannelManagerInterface {
  newChannel(participantIds: string[], chainId: string): Channel;

  // Suppose that each wallet's rule is to use a nonce one larger than the
  // greatest currently used nonce, for those participants.
  // Then, when creating a new channel, we could
  // - I send you the channel I think we should use
  // - You send me the channel you think we should use
  // - We both use the return value of `sync(channel)` (this is a CRDT)
  // If two wallets end up using different nonces, then they'll end up using the same nonce
  // after calling `sync`
  //
  // I think this requires acquiring a mutex on the participants when `newChannel` is called,
  // and releasing the lock when `sync` is called "enough times"
  sync(participantIds: string[], channel: Channel): Channel;
}

// TODO: Should do checks around the chainID

export class ChannelManager implements ChannelManagerInterface {
  private _nonces: Record<string, string>;
  private key(participants: string[]): string {
    return JSON.stringify(participants);
  }

  public newChannel(participantIds: string[], chainId: string): Channel {
    // TODO
    const participants = participantIds;
    const key = this.key(participantIds);
    this._nonces[key] = add(1, this._nonces[key] || 0);
    const channelNonce = this._nonces[key];
    this.nonceOk(participantIds, channelNonce);
    return { participants, chainId, channelNonce };
  }

  public sync(participantIds: string[], channel: Channel): Channel {
    // TODO
    return channel;
  }

  private nonceOk(participants: string[], nonce: string): boolean {
    return gt(nonce, this._nonces[this.key(participants)] || -1);
  }
}
