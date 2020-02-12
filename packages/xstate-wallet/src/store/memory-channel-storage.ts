import {ChannelConstants, StateVariables, SignedState, Participant} from './types';
import {signState, hashState, getSignerAddress, calculateChannelId} from './state-utils';

export interface ChannelStoreEntry {
  readonly channelId: string;
  readonly myIndex: number;
  readonly latest: StateVariables;
  readonly supported: StateVariables | undefined;
  readonly latestSupportedByMe: StateVariables | undefined;
  readonly channelConstants: ChannelConstants;

  readonly stateVariables: Record<string, StateVariables>; // TODO: Should we even expose this?
  readonly signatures: Record<string, (string | undefined)[]>; // TODO: Should we even expose this?
}

export class MemoryChannelStoreEntry implements ChannelStoreEntry {
  constructor(
    public readonly channelConstants: ChannelConstants,
    public readonly myIndex: number,
    public stateVariables: Record<string, StateVariables> = {},
    public signatures: Record<string, string[]> = {}
  ) {}

  private mySignature(stateVars: StateVariables, signatures: string[]): boolean {
    const state = {...stateVars, ...this.channelConstants};
    return signatures.some(sig => getSignerAddress(state, sig) === this.myAddress);
  }

  private get myAddress(): string {
    return this.participants[this.myIndex].signingAddress;
  }

  private get sortedByTurnNum(): Array<StateVariables & {signatures: string[]}> {
    return Object.keys(this.stateVariables)
      .map(k => {
        return {...this.stateVariables[k], signatures: this.signatures[k]};
      })
      .sort((a, b) => a.turnNum.sub(b.turnNum).toNumber());
  }

  get supported() {
    // TODO: proper check
    return this.sortedByTurnNum.find(s => s.signatures.length === this.participants.length);
  }

  get latestSupportedByMe() {
    return this.sortedByTurnNum.find(s => this.mySignature(s, s.signatures));
  }
  get latest(): StateVariables {
    return this.sortedByTurnNum[0];
  }

  get channelId(): string {
    return calculateChannelId(this.channelConstants);
  }

  get participants(): Participant[] {
    return this.channelConstants.participants;
  }

  signAndAdd(stateVars: StateVariables, privateKey: string): SignedState {
    const state = {...stateVars, ...this.channelConstants};

    const signatureString = signState(state, privateKey);

    this.addState(stateVars, signatureString);

    return {
      ...stateVars,
      ...this.channelConstants,
      signature: signatureString
    };
  }

  addState(stateVars: StateVariables, signature: string) {
    const state = {...stateVars, ...this.channelConstants};
    const stateHash = hashState(state);
    this.stateVariables[stateHash] = stateVars;
    const {participants} = this.channelConstants;

    // check the signature
    const signer = getSignerAddress(state, signature);
    const signerIndex = participants.findIndex(p => p.signingAddress === signer);

    if (signerIndex === -1) {
      throw new Error('State not signed by a participant of this channel');
    }

    if (!this.signatures[stateHash]) {
      this.signatures[stateHash] = new Array(this.nParticipants());
    }

    this.signatures[stateHash][signerIndex] = signature;
  }
  private nParticipants(): number {
    return this.channelConstants.participants.length;
  }
}
