import _ from 'lodash';
import {
  ChannelConstants,
  StateVariables,
  SignedState,
  Participant,
  ChannelStoredData,
  SignedStateWithHash,
  SignedStateVarsWithHash,
  StateVariablesWithHash,
  Funding,
  SignatureEntry,
  hashState,
  calculateChannelId,
  createSignatureEntry,
  outcomesEqual
} from '@statechannels/wallet-core';

import {logger} from '../logger';

import {Errors} from '.';
export type SignedStateVariables = StateVariables & {signatures: SignatureEntry[]};

export class ChannelStoreEntry {
  private stateVariables: Array<SignedStateVarsWithHash> = [];

  public funding: Funding | undefined = undefined;

  public readonly myIndex: number;
  public readonly channelConstants: ChannelConstants;
  public readonly applicationDomain?: string;

  constructor(channelData: ChannelStoredData) {
    const {myIndex, stateVariables, funding, applicationDomain, channelConstants} = channelData;

    this.myIndex = myIndex;
    this.stateVariables = stateVariables;
    this.funding = funding;
    this.applicationDomain = applicationDomain;

    this.myIndex = channelData.myIndex;

    this.channelConstants = channelConstants;

    this.stateVariables = channelData.stateVariables;
  }

  public setFunding(funding: Funding) {
    this.funding = funding;
  }

  public get sortedStates() {
    return this.signedStates.map(s => ({...this.channelConstants, ...s}));
  }

  private mySignature(stateVars: StateVariables, signatures: SignatureEntry[]): boolean {
    return signatures.some(sig => sig.signer === this.myAddress);
  }

  public get myAddress(): string {
    return this.participants[this.myIndex].signingAddress;
  }

  public get myTurn(): boolean {
    return (this.supported.turnNum + 1) % this.participants.length === this.myIndex;
  }

  private get signedStates(): Array<SignedStateWithHash> {
    return this.stateVariables.map(s => ({
      ...this.channelConstants,
      ...s
    }));
  }

  get isSupported() {
    return !!this._supported;
  }

  get hasConclusionProof() {
    return this.isSupported && this.support.every(s => s.isFinal);
  }

  get isChallenging() {
    // TODO: Check chain
    return false;
  }

  private get _supported() {
    const latestSupport = this._support;
    return latestSupport.length === 0 ? undefined : latestSupport[0];
  }

  public get support(): Array<SignedState> {
    return this._support.map(s => ({...this.channelConstants, ...s}));
  }

  // This is a simple check based on _requireValidTransition from NitroProtocol
  // We will eventually want to perform a proper validTransition check
  // but we will have to be careful where we do that to prevent eating up a ton of cpu
  private validChain(firstState: SignedState, secondState: SignedState): boolean {
    if (firstState.turnNum + 1 !== secondState.turnNum) {
      return false;
    }
    if (secondState.isFinal) {
      return outcomesEqual(firstState.outcome, secondState.outcome);
    }
    if (secondState.turnNum < 2 * this.nParticipants()) {
      return (
        outcomesEqual(firstState.outcome, secondState.outcome) &&
        firstState.appData === secondState.appData
      );
    }
    return true;
  }

  private get _support(): Array<SignedStateWithHash> {
    let support: Array<SignedStateWithHash> = [];

    let participantsWhoHaveNotSigned = new Set(this.participants.map(p => p.signingAddress));
    let previousState;

    for (const signedState of this.signedStates) {
      // If there is not a valid transition we know there cannot be a valid support
      // so we clear out what we have and start at the current signed state
      if (previousState && !this.validChain(signedState, previousState)) {
        support = [];
        participantsWhoHaveNotSigned = new Set(this.participants.map(p => p.signingAddress));
      }
      const moverIndex = signedState.turnNum % this.nParticipants();
      const moverForThisTurn = this.participants[moverIndex].signingAddress;

      // If the mover hasn't signed the state then we know it cannot be part of the support
      if (signedState.signatures.some(s => s.signer === moverForThisTurn)) {
        support.push(signedState);

        for (const signature of signedState.signatures) {
          participantsWhoHaveNotSigned.delete(signature.signer);
          if (participantsWhoHaveNotSigned.size === 0) {
            return support;
          }
        }
      }
      previousState = signedState;
    }
    return [];
  }

  get supported() {
    const vars = this._supported;
    if (!vars) throw new Error('No supported state found');
    return {...this.channelConstants, ...vars};
  }

  get isSupportedByMe() {
    return !!this._latestSupportedByMe;
  }

  private get _signedByMe() {
    return this.signedStates.filter(s => this.mySignature(s, s.signatures));
  }

  private get _latestSupportedByMe() {
    return this._signedByMe.find(() => true);
  }

  get latestSignedByMe() {
    const vars = this._latestSupportedByMe;
    if (!vars) throw new Error('No state supported by me');
    return {...this.channelConstants, ...vars};
  }

  get latest() {
    return {...this.channelConstants, ...this.signedStates[0]};
  }

  get latestState() {
    return {...this.channelConstants, ...this.latest};
  }

  get channelId(): string {
    return calculateChannelId(this.channelConstants);
  }

  get participants(): Participant[] {
    return this.channelConstants.participants;
  }

  signAndAdd(stateVars: StateVariables, privateKey: string): SignedState {
    if (this.isSupportedByMe && this.latestSignedByMe.turnNum >= stateVars.turnNum) {
      logger.error({entry: this.data(), stateVars}, Errors.staleState);
      throw Error(Errors.staleState);
    }

    const state = {...this.channelConstants, ...stateVars};

    const signatureEntry = createSignatureEntry(state, privateKey);

    return this.addState(stateVars, signatureEntry);
  }

  addState(stateVars: StateVariables, signatureEntry: SignatureEntry): SignedState {
    const signedStateVars: SignedStateVariables = {
      ...stateVars,
      signatures: [signatureEntry]
    };
    const withHash: StateVariablesWithHash = {
      ...stateVars,
      stateHash: hashState(this.state(signedStateVars))
    };

    // TODO: This check could be more efficient
    const {participants} = this.channelConstants;

    // check the signature

    const signerIndex = participants.findIndex(p => p.signingAddress === signatureEntry.signer);
    let entry = this.stateVariables.find(s => s.stateHash === withHash.stateHash);

    if (!entry) {
      entry = {...withHash, signatures: []};
      this.stateVariables.push(entry);
    }

    if (signerIndex === -1) {
      throw new Error('State not signed by a participant of this channel');
    }

    entry.signatures = _.uniqWith(_.concat(entry.signatures, signatureEntry), _.isEqual);

    this.clearOldStates();

    this.checkInvariants();

    return this.state(entry);
  }

  private checkInvariants() {
    const groupedByTurnNum = _.groupBy(this._signedByMe, s => s.turnNum.toString());
    const multipleSignedByMe = _.map(groupedByTurnNum, s => s.length)?.find(num => num > 1);

    if (multipleSignedByMe) {
      logger.error({entry: this.data()}, Errors.multipleSignedStates);

      throw Error(Errors.multipleSignedStates);
    }

    const {signedStates} = this;
    const turnNums = _.map(signedStates, s => s.turnNum);

    const duplicateTurnNums = turnNums.some((t, i) => turnNums.indexOf(t) != i);
    if (duplicateTurnNums) {
      logger.error({signedStates}, Errors.duplicateTurnNums);
      throw Error(Errors.duplicateTurnNums);
    }
    if (!isReverseSorted(turnNums)) {
      logger.error({signedStates: _.map(signedStates, s => s.turnNum)});
      throw Error(Errors.notSorted);
    }
  }

  private state(stateVars: SignedStateVariables): SignedState {
    return {...this.channelConstants, ...stateVars};
  }

  private clearOldStates() {
    this.stateVariables = _.reverse(_.sortBy(this.stateVariables, s => s.turnNum));
    // If we don't have a supported state we don't clean anything out
    if (this.isSupported) {
      // The support is returned in descending turn number so we need to grab the last element to find the earliest state
      const {stateHash: firstSupportStateHash} = this._support[this._support.length - 1];

      // Find where the first support state is in our current state array
      const supportIndex = this.stateVariables.findIndex(
        sv => sv.stateHash === firstSupportStateHash
      );
      // Take everything before that
      this.stateVariables = this.stateVariables.slice(0, supportIndex + 1);
    }
  }

  private nParticipants(): number {
    return this.channelConstants.participants.length;
  }

  public data(): ChannelStoredData {
    const channelConstants = {
      ...this.channelConstants,
      challengeDuration: this.channelConstants.challengeDuration,
      channelNonce: this.channelConstants.channelNonce
    };

    const stateVariables = _.cloneDeep(this.stateVariables);

    return {
      stateVariables,
      channelConstants,
      funding: this.funding,
      myIndex: this.myIndex,
      applicationDomain: this.applicationDomain
    };
  }

  static fromJson(data): ChannelStoreEntry {
    if (!data) {
      logger.error("Data is undefined or null, Memory Channel Store Entry can't be created.");
      return data;
    }

    // TODO: Add some sort of data validator here

    const {channelConstants, funding, myIndex, applicationDomain} = data;
    const stateVariables = data.stateVariables;

    return new ChannelStoreEntry({
      channelConstants,
      myIndex,
      stateVariables,
      funding,
      applicationDomain
    });
  }
}

function isReverseSorted(arr) {
  const len = arr.length - 1;
  for (let i = 0; i < len; ++i) {
    if (arr[i] < arr[i + 1]) {
      return false;
    }
  }
  return true;
}
