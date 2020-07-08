import {Model, snakeCaseMappers} from 'objection';
import {outcomesEqual, hashState, createSignatureEntry} from '../state-utils';
import _ from 'lodash';
import {
  SignedStateVarsWithHash,
  SignedStateVariables,
  Participant,
  StateVariablesWithHash,
  ChannelConstants,
  SignedState,
  Bytes32,
  Uint48,
  Address,
  Errors,
  StateVariables,
  SignatureEntry,
  SignedStateWithHash
} from '../store-types';
import {logger} from '../logger';

export type ChannelColumns = {
  readonly channelId: Bytes32;
  readonly chainId: Bytes32;
  readonly appDefinition: Address;
  readonly channelNonce: Uint48;
  readonly challengeDuration: Uint48;
  readonly participants: Participant[];
  readonly myIndex: number;
  readonly stateVariables: SignedStateVarsWithHash[];
};

export default class Channel extends Model implements ChannelColumns {
  readonly id!: number;
  readonly channelId: Bytes32;
  readonly chainId: Bytes32;
  readonly appDefinition: Address;
  readonly channelNonce: Uint48;
  readonly challengeDuration: Uint48;
  readonly participants: Participant[];
  readonly myIndex: number;
  readonly stateVariables: SignedStateVarsWithHash[];

  static tableName = 'channels';

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  // Modifiers
  signAndAdd(stateVars: StateVariables, privateKey: string): SignedState {
    if (this.isSupportedByMe && this.latestSignedByMe.turnNum >= stateVars.turnNum) {
      logger.error({entry: this.channelId, stateVars}, Errors.staleState);
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

  // Computed
  public get channelConstants(): ChannelConstants {
    const {channelNonce, challengeDuration, chainId, participants, appDefinition} = this;
    return {channelNonce, challengeDuration, chainId, participants, appDefinition};
  }

  public get sortedStates() {
    return this.stateVariables.map(s => ({...this.channelConstants, ...s}));
  }

  public get myAddress(): Address {
    return this.participants[this.myIndex].signingAddress;
  }

  public get myTurn(): boolean {
    return (this.supported.turnNum + 1) % this.participants.length === this.myIndex;
  }

  get isSupported() {
    return !!this._supported;
  }

  public get support(): Array<SignedState> {
    return this._support.map(s => ({...this.channelConstants, ...s}));
  }

  get hasConclusionProof() {
    return this.isSupported && this.support.every(s => s.isFinal);
  }

  get supported() {
    const vars = this._supported;
    if (!vars) throw new Error('No supported state found');
    return {...this.channelConstants, ...vars};
  }

  get isSupportedByMe() {
    return !!this._latestSupportedByMe;
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

  private get _supported() {
    const latestSupport = this._support;
    return latestSupport.length === 0 ? undefined : latestSupport[0];
  }
  private state(stateVars: SignedStateVariables): SignedState {
    return {...this.channelConstants, ...stateVars};
  }

  private get _signedByMe() {
    return this.signedStates.filter(s => this.mySignature(s, s.signatures));
  }

  private get _latestSupportedByMe() {
    return this._signedByMe.find(() => true);
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

  private checkInvariants() {
    const groupedByTurnNum = _.groupBy(this._signedByMe, s => s.turnNum.toString());
    const multipleSignedByMe = _.map(groupedByTurnNum, s => s.length)?.find(num => num > 1);

    if (multipleSignedByMe) {
      logger.error({entry: this.channelId}, Errors.multipleSignedStates);

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

  private get signedStates(): Array<SignedStateWithHash> {
    return this.stateVariables.map(s => ({...this.channelConstants, ...s}));
  }

  private mySignature(stateVars: StateVariables, signatures: SignatureEntry[]): boolean {
    return signatures.some(sig => sig.signer === this.myAddress);
  }

  private nParticipants(): number {
    return this.participants.length;
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
