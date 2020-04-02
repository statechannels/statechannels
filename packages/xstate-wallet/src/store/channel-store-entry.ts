import {
  ChannelConstants,
  StateVariables,
  SignedState,
  Participant,
  ChannelStoredData
} from './types';
import {signState, hashState, getSignerAddress, calculateChannelId} from './state-utils';
import _ from 'lodash';
import {BigNumber, bigNumberify} from 'ethers/utils';

import {Funding} from './store';

export class ChannelStoreEntry {
  public readonly channelConstants: ChannelConstants;
  public readonly myIndex: number;
  private stateVariables: Record<string, StateVariables & Partial<ChannelConstants>> = {};
  private signatures: Record<string, Array<string | undefined>> = {};
  public funding: Funding | undefined = undefined;
  public readonly applicationSite?: string;
  constructor(channelData: ChannelStoredData) {
    this.myIndex = channelData.myIndex;
    this.stateVariables = channelData.stateVariables;
    this.signatures = channelData.signatures;
    this.funding = channelData.funding;
    this.applicationSite = channelData.applicationSite;
    this.channelConstants = {
      chainId: channelData.channelConstants.chainId,
      participants: channelData.channelConstants.participants,
      appDefinition: channelData.channelConstants.appDefinition,
      challengeDuration: bigNumberify(channelData.channelConstants.challengeDuration),
      channelNonce: bigNumberify(channelData.channelConstants.channelNonce)
    };

    this.stateVariables = _.transform(this.stateVariables, (result, stateVariables, stateHash) => {
      result[stateHash] = _.pick(
        stateVariables,
        'turnNum',
        'outcome',
        'appData',
        'isFinal',
        'participants',
        'channelNonce',
        'appDefinition',
        'challengeDuration',
        'chainId'
      );
    });
  }

  public setFunding(funding: Funding) {
    this.funding = funding;
  }

  public get sortedStates() {
    return this.sortedByDescendingTurnNum.map(s => ({...this.channelConstants, ...s}));
  }

  private mySignature(stateVars: StateVariables, signatures: string[]): boolean {
    const state = {...stateVars, ...this.channelConstants};
    return signatures.some(sig => getSignerAddress(state, sig) === this.myAddress);
  }

  private get myAddress(): string {
    return this.participants[this.myIndex].signingAddress;
  }

  private getStateVariables(k): StateVariables {
    const vars = this.stateVariables[k];
    if (!vars) throw 'No variable found';
    return vars;
  }

  private getFilteredSignatures(k): string[] {
    function isString(x: string | undefined): x is string {
      return x !== undefined;
    }
    return (this.signatures[k] || []).filter(isString);
  }

  private get signedStates(): Array<StateVariables & {signatures: string[]}> {
    return Object.keys(this.stateVariables).map(k => ({
      ...this.getStateVariables(k),
      signatures: this.getFilteredSignatures(k)
    }));
  }

  private get sortedByDescendingTurnNum(): Array<StateVariables & {signatures: string[]}> {
    return this.signedStates.sort((a, b) => b.turnNum.sub(a.turnNum).toNumber());
  }

  get isSupported() {
    return !!this._supported;
  }

  get isFinalized() {
    return this.isSupported && this.supported.isFinal;
  }

  private get _supported() {
    // TODO: proper check
    return this.sortedByDescendingTurnNum.find(
      s => s.signatures.filter(sig => !!sig).length === this.participants.length
    );
  }

  get supported() {
    const vars = this._supported;
    if (!vars) throw new Error('No supported state found');
    return {...this.channelConstants, ...vars};
  }
  get support() {
    // TODO: This should return the whole support
    // aka the whole chain of signed states that support the latest state
    return [{...this.channelConstants, ...this.supported}];
  }
  get isSupportedByMe() {
    return !!this._latestSupportedByMe;
  }

  private get _latestSupportedByMe() {
    return this.sortedByDescendingTurnNum.find(s => this.mySignature(s, s.signatures));
  }

  get latestSupportedByMe() {
    const vars = this._latestSupportedByMe;
    if (!vars) throw new Error('No state supported by me');
    return {...this.channelConstants, ...vars};
  }

  get latest() {
    return {...this.channelConstants, ...this.sortedByDescendingTurnNum[0]};
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
    const state = {...stateVars, ...this.channelConstants};

    const signatureString = signState(state, privateKey);

    this.addState(stateVars, signatureString);

    return {
      ...stateVars,
      ...this.channelConstants,
      signatures: this.getFilteredSignatures(hashState(state))
    };
  }

  addState(stateVars: StateVariables, signature: string) {
    const state = {
      ...stateVars,
      ...this.channelConstants
    };
    const stateHash = hashState(state);
    this.stateVariables[stateHash] = stateVars;
    const {participants} = this.channelConstants;

    // check the signature
    const signer = getSignerAddress(state, signature);
    const signerIndex = participants.findIndex(p => p.signingAddress === signer);

    if (signerIndex === -1) {
      throw new Error('State not signed by a participant of this channel');
    }

    const signatures =
      this.signatures[stateHash] ?? new Array<string | undefined>(this.nParticipants());
    signatures[signerIndex] = signature;
    this.signatures[stateHash] = signatures;

    // TODO: Since the supported state check doesn't work correctly this GC doesn't work
    // and eats up a lot of CPU. Temporarily disabling
    // See https://github.com/statechannels/monorepo/issues/1344

    // // Garbage collect stale states
    // // TODO: Examine the safety here
    // this.stateVariables = _.transform(this.stateVariables, (result, stateVars, stateHash) => {
    //   if (
    //     !this.isSupported ||
    //     this.inSupport(stateHash) ||
    //     stateVars.turnNum.gt(this.supported.turnNum)
    //   )
    //     result[stateHash] = stateVars;
    // });
  }

  // private inSupport(key): boolean {
  //   const supportKeys = this.isSupported
  //     ? // TODO get the proper keys
  //       [hashState({...this.supported, ...this.channelConstants})]
  //     : [];
  //   return supportKeys.indexOf(key) !== -1;
  // }

  private nParticipants(): number {
    return this.channelConstants.participants.length;
  }

  public data(): ChannelStoredData {
    const channelConstants = {
      ...this.channelConstants,
      challengeDuration: this.channelConstants.challengeDuration.toString(),
      channelNonce: this.channelConstants.channelNonce.toString()
    };

    const stateVariables: Record<string, any> = ChannelStoreEntry.prepareStateVariables(
      _.cloneDeep(this.stateVariables)
    );

    return {
      stateVariables,
      channelConstants,
      signatures: this.signatures,
      funding: this.funding,
      myIndex: this.myIndex,
      applicationSite: this.applicationSite
    };
  }
  static fromJson(data) {
    if (!data) {
      console.error("Data is undefined or null, Memory Channel Store Entry can't be created.");
      return data;
    }
    const {channelConstants, signatures, funding, myIndex, applicationSite} = data;
    const stateVariables = ChannelStoreEntry.prepareStateVariables(data.stateVariables);
    channelConstants.challengeDuration = new BigNumber(channelConstants.challengeDuration);
    channelConstants.channelNonce = new BigNumber(channelConstants.channelNonce);
    return new ChannelStoreEntry({
      channelConstants,
      myIndex,
      stateVariables,
      signatures,
      funding,
      applicationSite
    });
  }

  private static prepareStateVariables(
    stateVariables,
    parserFunction: (data: string | BigNumber) => BigNumber | string = v => new BigNumber(v)
  ) {
    for (const stateHash in stateVariables) {
      const state = stateVariables[stateHash];
      if (state.turnNum) {
        state.turnNum = parserFunction(state.turnNum);
      }
      if (state.channelNonce) {
        state.channelNonce = parserFunction(state.channelNonce);
      }
      if (state.challengeDuration) {
        state.challengeDuration = parserFunction(state.challengeDuration);
      }
      state.outcome = ChannelStoreEntry.toggleBigNumberOutcome(state.outcome, parserFunction);
    }
    return stateVariables;
  }

  private static toggleBigNumberOutcome(
    outcome,
    parserFunction: (data: string | BigNumber) => BigNumber | string
  ) {
    if (outcome.allocationItems) {
      return {
        ...outcome,
        allocationItems: outcome.allocationItems.map(item => ({
          ...item,
          amount: parserFunction(item.amount)
        }))
      };
    } else if (outcome.simpleAllocations) {
      return {
        ...outcome,
        simpleAllocations: outcome.simpleAllocations.map(sA =>
          ChannelStoreEntry.toggleBigNumberOutcome(sA, parserFunction)
        )
      };
    } else {
      return outcome;
    }
  }
}
