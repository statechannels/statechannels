import {Transaction} from 'objection';
import {
  SignedState,
  Objective,
  SignedStateWithHash,
  SignedStateVarsWithHash,
  Message,
  hashState,
  State,
  calculateChannelId,
  StateVariables,
  ChannelConstants,
  Participant,
  makeDestination,
} from '@statechannels/wallet-core';
import _ from 'lodash';
import {HashZero} from '@ethersproject/constants';
import {Either, right} from 'fp-ts/lib/Either';
import {ChannelResult} from '@statechannels/client-api-schema';

import {Channel, SyncState, RequiredColumns, ChannelError} from '../models/channel';
import {SigningWallet} from '../models/signing-wallet';
import {addHash} from '../state-utils';
import {ChannelState} from '../protocols/state';
import {WalletError, Values} from '../errors/wallet-error';
import knex from '../db/connection';
import {Bytes32} from '../type-aliases';

export type AppHandler<T> = (tx: Transaction, channel: ChannelState) => T;
export type MissingAppHandler<T> = (channelId: string) => T;

const throwMissingChannel: MissingAppHandler<any> = (channelId: string) => {
  throw new ChannelError(ChannelError.reasons.channelMissing, {channelId});
};

export const Store = {
  getFirstParticipant: async function(): Promise<Participant> {
    const signingKey = await SigningWallet.query().first();
    if (!signingKey) throw new StoreError(StoreError.reasons.missingSigningKey);
    return {
      participantId: signingKey.address,
      signingAddress: signingKey.address,
      destination: makeDestination(HashZero),
    };
  },

  /**
   *
   * @param channelId application channel Id
   * @param cb critical code to be executed while holding a lock on channelId
   *
   * This excutes `cb` within the context of a SQL transaction, after first acquiring a row-level lock
   * on a single row in the Channels table. This guarantees that at most one `cb` can be executing
   * concurrently across all wallets.
   */
  lockApp: async function<T>(
    channelId: Bytes32,
    criticalCode: AppHandler<T>,
    onChannelMissing: MissingAppHandler<T> = throwMissingChannel
  ): Promise<T> {
    return knex.transaction(async tx => {
      const channel = await Channel.query(tx)
        .where({channelId})
        .forUpdate()
        .first();

      if (!channel) return onChannelMissing(channelId);
      return criticalCode(tx, channel.protocolState);
    });
  },

  signState: async function(
    channelId: Bytes32,
    vars: StateVariables,
    tx: Transaction
  ): Promise<{outgoing: SyncState; channelResult: ChannelResult}> {
    let channel = await Channel.forId(channelId, tx);

    const state: State = {...channel.channelConstants, ...vars};

    validateStateFreshness(state, channel);

    const signatureEntry = channel.signingWallet.signState(state);
    const signedState = {...state, signatures: [signatureEntry]};

    channel = await this.addSignedState(signedState, tx);

    const sender = channel.participants[channel.myIndex].participantId;
    const data = {signedStates: [addHash(signedState)]};
    const notMe = (_p: any, i: number): boolean => i !== channel.myIndex;

    const outgoing = state.participants.filter(notMe).map(({participantId: recipient}) => ({
      type: 'NotifyApp' as 'NotifyApp',
      notice: {
        method: 'MessageQueued' as 'MessageQueued',
        params: {sender, recipient, data},
      },
    }));

    const {channelResult} = channel;

    return {outgoing, channelResult};
  },
  getChannel: async function(
    channelId: Bytes32,
    tx: Transaction | undefined
  ): Promise<ChannelState | undefined> {
    return (await Channel.forId(channelId, tx))?.protocolState;
  },

  getChannels: async function(): Promise<ChannelState[]> {
    return (await Channel.query()).map(channel => channel.protocolState);
  },

  pushMessage: async function(message: Message, tx: Transaction): Promise<Bytes32[]> {
    for (const ss of message.signedStates || []) {
      await this.addSignedState(ss, tx);
    }

    for (const o of message.objectives || []) {
      await this.addObjective(o, tx);
    }

    const stateChannelIds = message.signedStates?.map(ss => calculateChannelId(ss)) || [];
    // TODO: generate channelIds from objectives
    const objectiveChannelIds: Bytes32[] = [];
    return stateChannelIds.concat(objectiveChannelIds);
  },

  addObjective: async function(
    _objective: Objective,
    _tx: Transaction
  ): Promise<Either<StoreError, undefined>> {
    // TODO: Implement this
    return Promise.resolve(right(undefined));
  },
  addSignedState: async function(signedState: SignedState, tx: Transaction): Promise<Channel> {
    validateSignatures(signedState);

    const {address: signingAddress} = await getSigningWallet(signedState, tx);

    const channel = await getOrCreateChannel(signedState, signingAddress, tx);

    let channelVars = channel.vars;

    channelVars = addState(channelVars, signedState);

    channelVars = clearOldStates(channelVars, channel.isSupported ? channel.support : undefined);

    validateInvariants(channelVars, channel.myAddress);

    const cols = {...channel.channelConstants, vars: channelVars, signingAddress};

    return await Channel.query(tx)
      .where({channelId: channel.channelId})
      .update(cols)
      .returning('*')
      .first();
  },
};

class StoreError extends WalletError {
  readonly type = WalletError.errors.StoreError;

  static readonly reasons = {
    duplicateTurnNums: 'multiple states with same turn number',
    notSorted: 'states not sorted',
    multipleSignedStates: 'Store signed multiple states for a single turn',
    invalidSignature: 'Invalid signature',
    notInChannel: 'Not in channel',
    staleState: 'Stale state',
    missingSigningKey: 'Missing a signing key',
  } as const;
  constructor(reason: Values<typeof StoreError.reasons>, public readonly data: any = undefined) {
    super(reason);
  }
}

async function getOrCreateChannel(
  constants: ChannelConstants,
  signingAddress: string,
  tx: Transaction
): Promise<Channel> {
  const channelId = calculateChannelId(constants);
  let channel = await Channel.query(tx)
    .where('channelId', channelId)
    .first();

  if (!channel) {
    const cols: RequiredColumns = {...constants, vars: [], signingAddress};
    channel = Channel.fromJson(cols);
    await Channel.query(tx).insert(channel);
  }
  return channel;
}
async function getSigningWallet(signedState: SignedState, tx: Transaction): Promise<SigningWallet> {
  const addresses = signedState.participants.map(p => p.signingAddress);
  const signingWallet = await SigningWallet.query(tx)
    .whereIn('address', addresses)
    .first();

  if (!signingWallet) {
    throw new StoreError(StoreError.reasons.notInChannel);
  }
  return signingWallet;
}
/*
 * Validator functions
 */

function validateSignatures(signedState: SignedState): void {
  const {participants} = signedState;

  signedState.signatures.map(sig => {
    const signerIndex = participants.findIndex(p => p.signingAddress === sig.signer);
    if (signerIndex === -1) {
      throw new StoreError(StoreError.reasons.invalidSignature, {signedState, signature: sig});
    }
  });
}

function validateStateFreshness(signedState: State, channel: Channel): void {
  if (channel.latestSignedByMe && channel.latestSignedByMe.turnNum >= signedState.turnNum) {
    throw new StoreError(StoreError.reasons.staleState);
  }
}

function validateInvariants(stateVars: SignedStateVarsWithHash[], myAddress: string): void {
  const signedByMe = stateVars.filter(s => s.signatures.some(sig => sig.signer === myAddress));
  const groupedByTurnNum = _.groupBy(signedByMe, s => s.turnNum.toString());
  const multipleSignedByMe = _.map(groupedByTurnNum, s => s.length)?.find(num => num > 1);

  if (multipleSignedByMe) {
    throw new StoreError(StoreError.reasons.multipleSignedStates);
  }

  const turnNums = _.map(stateVars, s => s.turnNum);

  const duplicateTurnNums = turnNums.some((t, i) => turnNums.indexOf(t) != i);
  if (duplicateTurnNums) {
    throw new StoreError(StoreError.reasons.duplicateTurnNums);
  }
  if (!isReverseSorted(turnNums)) {
    throw new StoreError(StoreError.reasons.notSorted);
  }
}

function isReverseSorted(arr: number[]): boolean {
  const len = arr.length - 1;
  for (let i = 0; i < len; ++i) {
    if (arr[i] < arr[i + 1]) {
      return false;
    }
  }
  return true;
}

/**
 * State variable modifiers
 */
function addState(
  vars: SignedStateVarsWithHash[],
  signedState: SignedState
): SignedStateVarsWithHash[] {
  validateSignatures(signedState);

  const clonedVariables = _.cloneDeep(vars);
  const stateHash = hashState(signedState);
  const existingStateIndex = clonedVariables.findIndex(v => v.stateHash === stateHash);
  if (existingStateIndex > -1) {
    const mergedSignatures = _.uniq(
      signedState.signatures.concat(clonedVariables[existingStateIndex].signatures)
    );

    clonedVariables[existingStateIndex].signatures = mergedSignatures;
    return clonedVariables;
  } else {
    return clonedVariables.concat({...signedState, stateHash});
  }
}

function clearOldStates(
  signedStates: SignedStateVarsWithHash[],
  support: SignedStateWithHash[] | undefined
): SignedStateVarsWithHash[] {
  const sorted = _.reverse(_.sortBy(signedStates, s => s.turnNum));
  // If we don't have a supported state we don't clean anything out
  if (support && support.length > 0) {
    // The support is returned in descending turn number so we need to grab the last element to find the earliest state
    const {stateHash: firstSupportStateHash} = support[support.length - 1];

    // Find where the first support state is in our current state array
    const supportIndex = sorted.findIndex(sv => sv.stateHash === firstSupportStateHash);
    // Take everything before that
    return sorted.slice(0, supportIndex + 1);
  } else {
    return sorted;
  }
}
