import {Transaction, TransactionOrKnex} from 'objection';
import {
  Objective,
  SignedStateWithHash,
  SignedStateVarsWithHash,
  State,
  calculateChannelId,
  StateVariables,
  ChannelConstants,
  Participant,
  makeDestination,
  serializeMessage,
  StateWithHash,
  isCreateChannel,
  hashState,
  deserializeObjective,
} from '@statechannels/wallet-core';
import {Payload as WirePayload, SignedState as WireSignedState} from '@statechannels/wire-format';
import _ from 'lodash';
import {HashZero} from '@ethersproject/constants';
import {ChannelResult, FundingStrategy} from '@statechannels/client-api-schema';
import {ethers} from 'ethers';
import Knex from 'knex';

import {
  Channel,
  SyncState,
  RequiredColumns,
  ChannelError,
  CHANNEL_COLUMNS,
} from '../models/channel';
import {SigningWallet} from '../models/signing-wallet';
import {addHash} from '../state-utils';
import {ChannelState, ChainServiceApi} from '../protocols/state';
import {WalletError, Values} from '../errors/wallet-error';
import {Bytes32} from '../type-aliases';
import {validateTransitionWithEVM} from '../evm-validator';
import {timerFactory, recordFunctionMetrics} from '../metrics';
import {fastRecoverAddress} from '../utilities/signatures';
import {pick} from '../utilities/helpers';

export type AppHandler<T> = (tx: Transaction, channel: ChannelState) => T;
export type MissingAppHandler<T> = (channelId: string) => T;
class UniqueViolationError extends Error {
  columns: string[] = [];
}

function isUniqueViolationError(error: any): error is UniqueViolationError {
  return error?.name === 'UniqueViolationError' && error?.columns[0] === 'enforce_one_row';
}

const throwMissingChannel: MissingAppHandler<any> = (channelId: string) => {
  throw new ChannelError(ChannelError.reasons.channelMissing, {channelId});
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export class Store {
  constructor(readonly timingMetrics: boolean, readonly skipEvmValidation: boolean) {
    if (timingMetrics) {
      this.getFirstParticipant = recordFunctionMetrics(this.getFirstParticipant);
      this.getOrCreateSigningAddress = recordFunctionMetrics(this.getOrCreateSigningAddress);
      this.lockApp = recordFunctionMetrics(this.lockApp);
      this.signState = recordFunctionMetrics(this.signState);
      this.getChannel = recordFunctionMetrics(this.getChannel);
      this.getStates = recordFunctionMetrics(this.getStates);
      this.getChannels = recordFunctionMetrics(this.getChannels);
      this.addObjective = recordFunctionMetrics(this.addObjective);
      this.pushMessage = recordFunctionMetrics(this.pushMessage);
      this.addSignedState = recordFunctionMetrics(this.addSignedState);
    }
  }

  async getFirstParticipant(knex: Knex): Promise<Participant> {
    const signingAddress = await this.getOrCreateSigningAddress(knex);
    return {
      participantId: signingAddress,
      signingAddress,
      destination: makeDestination(HashZero),
    };
  }

  async getOrCreateSigningAddress(knex: Knex): Promise<string> {
    const randomWallet = ethers.Wallet.createRandom();
    // signing_wallets table allows for only one row via database constraints
    try {
      // returning('*') only works with Postgres
      // https://vincit.github.io/objection.js/recipes/returning-tricks.html
      const signingWallet = await SigningWallet.query(knex)
        .insert({
          privateKey: randomWallet.privateKey,
          address: randomWallet.address,
        })
        .returning('*');
      return signingWallet.address;
    } catch (error) {
      if (isUniqueViolationError(error)) {
        return (await SigningWallet.query(knex).first()).address;
      }
      throw error;
    }
  }

  /**
   *
   * @param channelId application channel Id
   * @param cb critical code to be executed while holding a lock on channelId
   *
   * This excutes `cb` within the context of a SQL transaction, after first acquiring a row-level lock
   * on a single row in the Channels table. This guarantees that at most one `cb` can be executing
   * concurrently across all wallets.
   */
  async lockApp<T>(
    knex: Knex,
    channelId: Bytes32,
    criticalCode: AppHandler<T>,
    onChannelMissing: MissingAppHandler<T> = throwMissingChannel
  ): Promise<T> {
    return knex.transaction(async tx => {
      const timer = timerFactory(this.timingMetrics, `lock app ${channelId}`);
      const channel = await timer(
        'getting channel',
        async () =>
          await Channel.query(tx)
            .where({channelId})
            .forUpdate()
            .first()
      );

      if (!channel) return onChannelMissing(channelId);
      return timer('critical code', async () => criticalCode(tx, channel.protocolState));
    });
  }

  async signState(
    channelId: Bytes32,
    vars: StateVariables,
    tx: Transaction // Insist on a transaction since assSignedState requires it
  ): Promise<{outgoing: SyncState; channelResult: ChannelResult}> {
    const timer = timerFactory(this.timingMetrics, `signState ${channelId}`);
    let channel = await timer('getting channel', async () => Channel.forId(channelId, tx));

    const state: StateWithHash = addHash({...channel.channelConstants, ...vars});

    await timer('validating freshness', async () => validateStateFreshness(state, channel));

    const signatureEntry = await timer('signing', async () =>
      channel.signingWallet.signState(state)
    );
    const signedState = {...state, signatures: [signatureEntry]};

    channel = await timer('adding state', async () =>
      this.addSignedState(channel, signedState, tx)
    );

    const sender = channel.participants[channel.myIndex].participantId;
    const data = await timer('adding hash', async () => ({signedStates: [signedState]}));
    const notMe = (_p: any, i: number): boolean => i !== channel.myIndex;

    const outgoing = state.participants.filter(notMe).map(({participantId: recipient}) => ({
      type: 'NotifyApp' as 'NotifyApp',
      notice: {
        method: 'MessageQueued' as 'MessageQueued',
        params: serializeMessage(data, recipient, sender),
      },
    }));

    const {channelResult} = channel;

    return {outgoing, channelResult};
  }

  async addChainServiceRequest(
    channelId: Bytes32,
    type: ChainServiceApi,
    tx: Transaction
  ): Promise<void> {
    const channel = await Channel.forId(channelId, tx);

    await Channel.query(tx)
      .where({channelId: channel.channelId})
      .patch({chainServiceRequests: [...channel.chainServiceRequests, type]});
  }

  async getChannel(
    channelId: Bytes32,
    txOrKnex: TransactionOrKnex
  ): Promise<ChannelState | undefined> {
    return (await Channel.forId(channelId, txOrKnex))?.protocolState;
  }

  async getStates(
    channelId: Bytes32,
    txOrKnex: TransactionOrKnex
  ): Promise<{states: SignedStateWithHash[]; channelState: ChannelState}> {
    const channel = await Channel.forId(channelId, txOrKnex);

    if (!channel) throw new StoreError(StoreError.reasons.channelMissing);

    const {vars, channelConstants, protocolState: channelState} = channel;
    return {states: vars.map(ss => _.merge(ss, channelConstants)), channelState};
  }

  async getChannels(knex: Knex): Promise<ChannelState[]> {
    return (await Channel.query(knex)).map(channel => channel.protocolState);
  }

  async pushMessage(message: WirePayload, tx: Transaction): Promise<Bytes32[]> {
    const objectives = message.objectives?.map(deserializeObjective) || [];

    for (const o of objectives) {
      await this.addObjective(o, tx);
    }

    for (const ss of message.signedStates || []) {
      await this.addSignedState(undefined, addHash(ss), tx);
    }

    const stateChannelIds = message.signedStates?.map(ss => calculateChannelId(ss)) || [];
    function isDefined(s: string | undefined): s is string {
      return s !== undefined;
    }
    const objectiveChannelIds =
      objectives
        .map(objective =>
          isCreateChannel(objective) ? calculateChannelId(objective.data.signedState) : undefined
        )
        .filter(isDefined) || [];

    return stateChannelIds.concat(objectiveChannelIds);
  }

  async addObjective(objective: Objective, tx: Transaction): Promise<Channel> {
    if (isCreateChannel(objective)) {
      const {
        data: {signedState, fundingStrategy},
      } = objective;
      const channelId = calculateChannelId(signedState);
      const singedStateWithHash = {...signedState, stateHash: hashState(signedState)};
      validateSignatures(singedStateWithHash);
      if (await Channel.forId(channelId, tx)) {
        throw new StoreError(StoreError.reasons.duplicateChannel);
      }

      const channel = await createChannel(signedState, fundingStrategy, tx);
      channel.vars = await addState(channel.vars, singedStateWithHash);
      validateInvariants(channel.vars, channel.myAddress);

      const result = await Channel.query(tx)
        .where({channelId: channel.channelId})
        .patch({vars: channel.vars, fundingStrategy})
        .returning('*')
        .first();

      return result;
    } else {
      throw new StoreError(StoreError.reasons.unimplementedObjective);
    }
  }

  async addSignedState(
    maybeChannel: Channel | undefined,
    signedState: SignedStateWithHash,
    tx: Transaction // Insist on a transaction because validateTransitionWIthEVM requires it
  ): Promise<Channel> {
    const channelId = calculateChannelId(signedState);
    const timer = timerFactory(this.timingMetrics, `add signed state ${channelId}`);

    await timer('validating signatures', async () => validateSignatures(signedState));

    const channel =
      maybeChannel || (await timer('get channel', async () => getChannel(signedState, tx)));

    if (!this.skipEvmValidation && channel.supported) {
      const {supported} = channel;
      if (
        !(await timer('validating transition', async () =>
          validateTransitionWithEVM(supported, signedState, tx)
        ))
      ) {
        throw new StoreError('Invalid state transition', {
          from: channel.supported,
          to: signedState,
        });
      }
    }

    channel.vars = await timer('adding state', async () => addState(channel.vars, signedState));

    channel.vars = clearOldStates(channel.vars, channel.isSupported ? channel.support : undefined);

    await timer('validating invariants', async () =>
      validateInvariants(channel.vars, channel.myAddress)
    );

    const result = await timer('updating', async () =>
      Channel.query(tx)
        .where({channelId: channel.channelId})
        .patch({vars: channel.vars})
        .returning('*')
        .first()
    );

    return result;
  }
}

class StoreError extends WalletError {
  readonly type = WalletError.errors.StoreError;

  static readonly reasons = {
    duplicateChannel: 'Expected the channel to NOT exist in the database',
    duplicateTurnNums: 'multiple states with same turn number',
    notSorted: 'states not sorted',
    multipleSignedStates: 'Store signed multiple states for a single turn',
    invalidSignature: 'Invalid signature',
    notInChannel: 'Not in channel',
    staleState: 'Stale state',
    missingSigningKey: 'Missing a signing key',
    invalidTransition: 'Invalid state transition',
    channelMissing: 'Channel not found',
    unimplementedObjective: 'Unimplemented objective',
  } as const;
  constructor(reason: Values<typeof StoreError.reasons>, public readonly data: any = undefined) {
    super(reason);
  }
}

async function createChannel(
  constants: ChannelConstants,
  fundingStrategy: FundingStrategy,
  txOrKnex: TransactionOrKnex
): Promise<Channel> {
  const channelId = calculateChannelId(constants);

  const {address: signingAddress} = await getSigningWallet(constants, txOrKnex);

  const cols: RequiredColumns = pick(
    {
      ...constants,
      channelId,
      vars: [],
      chainServiceRequests: [],
      signingAddress,
      fundingStrategy,
    },
    ...CHANNEL_COLUMNS
  );
  const channel = Channel.fromJson(cols);
  return await Channel.query(txOrKnex)
    .insert(channel)
    .returning('*')
    .first();
}
async function getChannel(
  constants: ChannelConstants,
  txOrKnex: TransactionOrKnex
): Promise<Channel> {
  const channelId = calculateChannelId(constants);
  const channel = await Channel.forId(channelId, txOrKnex);

  if (!channel) {
    throw new StoreError(StoreError.reasons.channelMissing);
  }
  return channel;
}

async function getSigningWallet(
  channel: ChannelConstants,
  txOrKnex: TransactionOrKnex
): Promise<SigningWallet> {
  const addresses = channel.participants.map(p => p.signingAddress);
  const signingWallet = await SigningWallet.query(txOrKnex)
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

function validateSignatures(signedState: SignedStateWithHash): void {
  const {participants} = signedState;

  signedState.signatures.map(sig => {
    const signerAddress = fastRecoverAddress(signedState, sig.signature, signedState.stateHash);

    // We ensure that the signature is valid and verify that the signing address provided on the signature object is correct as well
    const validSignature =
      participants.find(p => p.signingAddress === signerAddress) && sig.signer === signerAddress;

    if (!validSignature) {
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
  signedState: SignedStateWithHash
): SignedStateVarsWithHash[] {
  const clonedVariables = _.cloneDeep(vars);
  const {stateHash} = signedState;
  const existingStateIndex = clonedVariables.findIndex(v => v.stateHash === stateHash);
  if (existingStateIndex > -1) {
    const mergedSignatures = _.uniqBy(
      signedState.signatures.concat(clonedVariables[existingStateIndex].signatures),
      sig => sig.signature
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
