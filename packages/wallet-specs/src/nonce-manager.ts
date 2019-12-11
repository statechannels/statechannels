import { add, Channel, gt } from '.';

/*
----------------
Nonce management
----------------
Wallet stores should implement a getNextNonce method that is deterministic in the
"happy path". 
This may change, which would require nonce-negotiation by default in protocols that create
new channels.

For example, say each wallet keeps track of the largest nonce used by a given
set of participants. Then `getNextNonce` returns one more than the largest current nonce.
In the absence of dropped messages, this returns the same value in any two wallets.

Protocols which use new nonces need to have a safeguard against disagreement in the case of
unexpected circumstances.
The `useNonce` method can be used by a protocol to force the use of a nonce other than
the output of `getNextNonce`. It update the store if the nonce is safe, and throw if the nonce
is unsafe.
*/

/*
PROBLEM:
My wallet should ensure that no two channels with the 
USE CASES
1.
  - I'm creating a new channel.
  - I have a set of participants that I will use
*/

export interface NonceManagerInterface {
  getNextNonce(participants: string[]): string;
  useNonce(participants: string[], nonce: string): boolean;
  nonceOk(participants: string[], nonce: string): boolean;
}

export class NonceManager implements NonceManagerInterface {
  private _nonces: Record<string, string>;

  private key(participants: string[]): string {
    return JSON.stringify(participants);
  }

  public getNextNonce(participants: string[]): string {
    const key = this.key(participants);
    this._nonces[key] = add(this._nonces[key] || 0, '0x01');
    return this._nonces[key];
  }

  public useNonce(participants: string[], nonce: string): boolean {
    if (this.nonceOk(participants, nonce)) {
      this._nonces[this.key(participants)] = nonce;
      return true;
    } else {
      throw new Error("Can't use this nonce");
    }
  }

  public nonceOk(participants: string[], nonce: string): boolean {
    return gt(nonce, this._nonces[this.key(participants)] || -1);
  }
}

/*
Scenario:
- I propose { participants: [me, you], channelNonce: 2}
- You propose { participants: [me, you], channelNonce: 5}
*/
