import Objection from 'objection';
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
} from '@statechannels/wallet-core';
import _ from 'lodash';
import {Either, left, right, isLeft} from 'fp-ts/lib/Either';
import {Bytes32, ChannelResult} from '@statechannels/client-api-schema';

import {Channel, SyncState, RequiredColumns} from '../models/channel';
import {SigningWallet} from '../models/signing-wallet';
import {addHash} from '../state-utils';
import {ChannelState} from '../protocols/state';

import {getOrThrow} from '.';

export const Store = {
  signState: async function(
    channelId: Bytes32,
    vars: StateVariables,
    tx: Objection.Transaction
  ): Promise<{outgoing: SyncState; channelResult: ChannelResult}> {
    let channel = await Channel.forId(channelId, tx);

    const state: State = {...channel.channelConstants, ...vars};

    const validationResult = validateStateFreshness(state, channel);

    if (isLeft(validationResult)) throw validationResult.left;

    const signatureEntry = channel.signingWallet.signState(state);
    const signedState = {...state, signatures: [signatureEntry]};

    const addStateResult = await this.addSignedState(signedState, tx);
    if (isLeft(addStateResult)) throw addStateResult.left;

    channel = await Channel.forId(channelId, tx);

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
    tx: Objection.Transaction | undefined
  ): Promise<ChannelState | undefined> {
    return (await Channel.forId(channelId, tx))?.protocolState;
  },

  pushMessage: async function(message: Message, tx: Objection.Transaction): Promise<Bytes32[]> {
    for (const ss of message.signedStates || []) {
      getOrThrow(await this.addSignedState(ss, tx));
    }

    for (const o of message.objectives || []) {
      getOrThrow(await this.addObjective(o, tx));
    }

    const stateChannelIds = message.signedStates?.map(ss => calculateChannelId(ss)) || [];
    // TODO: generate channelIds from objectives
    const objectiveChannelIds: Bytes32[] = [];
    return stateChannelIds.concat(objectiveChannelIds);
  },

  addObjective: async function(
    _objective: Objective,
    _tx: Objection.Transaction
  ): Promise<Either<StoreError, undefined>> {
    // TODO: Implement this
    return Promise.resolve(right(undefined));
  },
  addSignedState: async function(
    signedState: SignedState,
    tx: Objection.Transaction
  ): Promise<Either<StoreError, undefined>> {
    getOrThrow(validateSignatures(signedState));

    const {address: signingAddress} = getOrThrow(await getSigningWallet(signedState, tx));

    const channel = await getOrCreateChannel(signedState, signingAddress, tx);
    let channelVars = channel.vars;

    channelVars = getOrThrow(addState(channelVars, signedState));

    channelVars = getOrThrow(
      clearOldStates(channelVars, channel.isSupported ? channel.support : undefined)
    );

    const invariantValidationResult = validateInvariants(channelVars, channel.myAddress);
    if (isLeft(invariantValidationResult)) return invariantValidationResult;
    const cols = {...channel.channelConstants, vars: channelVars, signingAddress};

    await Channel.query(tx).update(cols);

    return right(undefined);
  },
};

class StoreError extends Error {
  readonly type = 'InvariantError';
  constructor(reason: StoreErrors, public readonly data: any = undefined) {
    super(reason);
  }
}

enum StoreErrors {
  duplicateTurnNums = 'multiple states with same turn number',
  notSorted = 'states not sorted',
  multipleSignedStates = 'Store signed multiple states for a single turn',
  invalidSignature = 'Invalid signature',
  notInChannel = 'Not in channel',
  staleState = 'Stale state',
}

async function getOrCreateChannel(
  constants: ChannelConstants,
  signingAddress: string,
  tx: Objection.Transaction
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
async function getSigningWallet(
  signedState: SignedState,
  tx: Objection.Transaction
): Promise<Either<StoreError, SigningWallet>> {
  const addresses = signedState.participants.map(p => p.signingAddress);
  const signingWallet = await SigningWallet.query(tx)
    .whereIn('address', addresses)
    .first();

  if (!signingWallet) {
    return left(new StoreError(StoreErrors.notInChannel));
  }
  return right(signingWallet);
}
/*
 * Validator functions
 */

function validateSignatures(signedState: SignedState): Either<StoreError, undefined> {
  const {participants} = signedState;

  for (const sig of signedState.signatures) {
    const signerIndex = participants.findIndex(p => p.signingAddress === sig.signer);
    if (signerIndex === -1) {
      return left(new StoreError(StoreErrors.invalidSignature, {signedState, signature: sig}));
    }
  }
  return right(undefined);
}

function validateStateFreshness(
  signedState: State,
  channel: Channel
): Either<StoreError, undefined> {
  if (
    channel.isSupportedByMe &&
    channel.latestSignedByMe &&
    channel.latestSignedByMe.turnNum >= signedState.turnNum
  ) {
    return left(new StoreError(StoreErrors.staleState));
  }
  return right(undefined);
}

function validateInvariants(
  stateVars: SignedStateVarsWithHash[],
  myAddress: string
): Either<StoreError, undefined> {
  const signedByMe = stateVars.filter(s => s.signatures.some(sig => sig.signer === myAddress));
  const groupedByTurnNum = _.groupBy(signedByMe, s => s.turnNum.toString());
  const multipleSignedByMe = _.map(groupedByTurnNum, s => s.length)?.find(num => num > 1);

  if (multipleSignedByMe) {
    return left(new StoreError(StoreErrors.multipleSignedStates));
  }

  const turnNums = _.map(stateVars, s => s.turnNum);

  const duplicateTurnNums = turnNums.some((t, i) => turnNums.indexOf(t) != i);
  if (duplicateTurnNums) {
    return left(new StoreError(StoreErrors.duplicateTurnNums));
  }
  if (!isReverseSorted(turnNums)) {
    return left(new StoreError(StoreErrors.notSorted));
  }
  return right(undefined);
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
): Either<StoreError, SignedStateVarsWithHash[]> {
  const validationResult = validateSignatures(signedState);
  if (isLeft(validationResult)) return validationResult;

  const clonedVariables = _.cloneDeep(vars);
  const stateHash = hashState(signedState);
  const existingStateIndex = clonedVariables.findIndex(v => v.stateHash === stateHash);
  if (existingStateIndex > -1) {
    const mergedSignatures = _.uniq(
      signedState.signatures.concat(clonedVariables[existingStateIndex].signatures)
    );

    clonedVariables[existingStateIndex].signatures = mergedSignatures;
    return right(clonedVariables);
  } else {
    return right(clonedVariables.concat({...signedState, stateHash}));
  }
}

function clearOldStates(
  signedStates: SignedStateVarsWithHash[],
  support: SignedStateWithHash[] | undefined
): Either<StoreError, SignedStateVarsWithHash[]> {
  const sorted = _.reverse(_.sortBy(signedStates, s => s.turnNum));
  // If we don't have a supported state we don't clean anything out
  if (support && support.length > 0) {
    // The support is returned in descending turn number so we need to grab the last element to find the earliest state
    const {stateHash: firstSupportStateHash} = support[support.length - 1];

    // Find where the first support state is in our current state array
    const supportIndex = sorted.findIndex(sv => sv.stateHash === firstSupportStateHash);
    // Take everything before that
    return right(sorted.slice(0, supportIndex + 1));
  } else {
    return right(sorted);
  }
}
