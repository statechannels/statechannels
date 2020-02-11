import {ChannelConstants, StateVariables, SignedState, Participant} from './types';
import {
  getChannelId,
  signState,
  State as NitroState,
  hashState,
  getStateSignerAddress
} from '@statechannels/nitro-protocol';
import {splitSignature, joinSignature} from 'ethers/utils';

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
  public channelConstants: ChannelConstants;
  public stateVariables: Record<string, StateVariables>;
  public signatures: Record<string, string[]>;
  public myIndex: number;

  constructor(channelConstants: ChannelConstants, myIndex: number) {
    this.channelConstants = channelConstants;
    this.myIndex = myIndex;
    this.stateVariables = {};
    this.signatures = {};
  }

  private mySignature(stateVars: StateVariables, signatures: string[]): boolean {
    const state = this.toNitroState(stateVars);
    return signatures.some(
      sig => getStateSignerAddress({state, signature: splitSignature(sig)}) === this.myAddress
    );
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
    const {chainId, channelNonce, participants} = this.channelConstants;
    const addresses = participants.map(p => p.signingAddress);
    return getChannelId({
      chainId,
      channelNonce: channelNonce.toString(),
      participants: addresses
    });
  }

  get participants(): Participant[] {
    return this.channelConstants.participants;
  }

  signAndAdd(stateVars: StateVariables, privateKey: string): SignedState {
    const state = this.toNitroState(stateVars);

    const {signature} = signState(state, privateKey);
    const signatureString = joinSignature(signature);

    this.addState(stateVars, signatureString);

    return {
      channelId: this.channelId,
      ...stateVars,
      ...this.channelConstants,
      signature: signatureString
    };
  }

  addState(stateVars: StateVariables, signature: string) {
    const state = this.toNitroState(stateVars);
    const stateHash = hashState(state);
    this.stateVariables[stateHash] = stateVars;
    const {participants} = this.channelConstants;

    // check the signature
    const signer = getStateSignerAddress({state, signature: splitSignature(signature)});
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

  // Converts to the legacy State format expected by the Nitro protocol state
  private toNitroState(stateVars: StateVariables): NitroState {
    const {
      challengeDuration,
      appDefinition,
      channelNonce,
      participants,
      chainId
    } = this.channelConstants;
    const channel = {
      channelNonce: channelNonce.toString(),
      chainId,
      participants: participants.map(x => x.signingAddress)
    };

    return {
      ...stateVars,
      outcome: [], // TODO: Convert to nitro outcome
      challengeDuration: challengeDuration.toNumber(),
      appDefinition,
      channel,
      turnNum: stateVars.turnNum.toNumber()
    };
  }
}
