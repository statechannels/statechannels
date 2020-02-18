import _ from 'lodash';

import {ChannelConstants, StateVariables, SignedState, Participant} from './types';
import {signState, hashState, getSignerAddress, calculateChannelId} from './state-utils';
import {Funding} from './memory-store';

export interface ChannelStoreEntry {
  readonly channelId: string;
  readonly myIndex: number;
  readonly latest: StateVariables;
  readonly supported: StateVariables | undefined;
  readonly latestSupportedByMe: StateVariables | undefined;
  readonly channelConstants: ChannelConstants;
  readonly funding?: Funding;
}

export class MemoryChannelStoreEntry implements ChannelStoreEntry {
  constructor(
    public readonly channelConstants: ChannelConstants,
    public readonly myIndex: number,
    private states: Record<string, StateVariables | undefined> = {},
    private signatures: Record<string, string[] | undefined> = {},
    public funding: Funding | undefined = undefined
  ) {}

  public setFunding(funding: Funding) {
    this.funding = funding;
  }
  private mySignature(stateVars: StateVariables, signatures: string[]): boolean {
    const state = {...stateVars, ...this.channelConstants};
    return signatures.some(sig => getSignerAddress(state, sig) === this.myAddress);
  }

  private get myAddress(): string {
    return this.participants[this.myIndex].signingAddress;
  }

  private getStateVariables(k): StateVariables {
    const vars = this.states[k];
    if (!vars) throw 'No variable found';
    return vars;
  }

  private getSignatures(k): string[] {
    return this.signatures[k] || [];
  }

  private get signedStates(): Array<StateVariables & {signatures: string[]}> {
    return Object.keys(this.states).map(k => {
      return {...this.getStateVariables(k), signatures: this.getSignatures(k)};
    });
  }

  private get sortedByTurnNum(): Array<StateVariables & {signatures: string[]}> {
    return this.signedStates.sort((a, b) => a.turnNum.sub(b.turnNum).toNumber());
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
    this.states[stateHash] = stateVars;
    const {participants} = this.channelConstants;

    // check the signature
    const signer = getSignerAddress(state, signature);
    const signerIndex = participants.findIndex(p => p.signingAddress === signer);

    if (signerIndex === -1) {
      throw new Error('State not signed by a participant of this channel');
    }

    const signatures = this.signatures[stateHash] ?? new Array(this.nParticipants());
    signatures[signerIndex] = signature;
    this.signatures[stateHash] = signatures;

    // Garbage collect stale states
    Object.keys(this.states).forEach(key => {
      if (
        this.supported &&
        this.getStateVariables(key).turnNum.lte(this.supported.turnNum) &&
        !this.inSupport(key)
      ) {
        this.states = _.omit(this.states, key);
        this.signatures = _.omit(this.signatures, key);
      }
    });
  }

  private inSupport(key): boolean {
    const supportKeys = this.supported
      ? // TODO get the proper keys
        [hashState({...this.supported, ...this.channelConstants})]
      : [];
    return supportKeys.indexOf(key) !== -1;
  }

  private nParticipants(): number {
    return this.channelConstants.participants.length;
  }
}
