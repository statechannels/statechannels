import {Transaction, TransactionOrKnex} from 'objection';
import {
  Objective,
  Outcome,
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
  deserializeObjective,
  wireStateToNitroState,
  toNitroState,
  deserializeOutcome,
  convertToInternalParticipant,
  SignatureEntry,
  Payload,
  isOpenChannel,
  convertToParticipant,
  SignedState,
  objectiveId,
  deserializeState,
  statesEqual,
} from '@statechannels/wallet-core';
import {Payload as WirePayload, SignedState as WireSignedState} from '@statechannels/wire-format';
import {State as NitroState} from '@statechannels/nitro-protocol';
import _ from 'lodash';
import {ChannelResult, FundingStrategy} from '@statechannels/client-api-schema';
import {ethers, constants} from 'ethers';
import Knex from 'knex';

import {
  Channel,
  RequiredColumns,
  ChannelError,
  CHANNEL_COLUMNS,
  isChannelMissingError,
} from '../models/channel';
import {SigningWallet} from '../models/signing-wallet';
import {addHash} from '../state-utils';
import {ChannelState, ChainServiceApi, toChannelResult} from '../protocols/state';
import {WalletError, Values} from '../errors/wallet-error';
import {Bytes32, Address, Uint256, Bytes} from '../type-aliases';
import {validateTransitionWithEVM} from '../evm-validator';
import {timerFactory, recordFunctionMetrics, setupDBMetrics} from '../metrics';
import {pick} from '../utilities/helpers';
import {Funding} from '../models/funding';
import {Nonce} from '../models/nonce';
import {recoverAddress} from '../utilities/signatures';
import {Outgoing} from '../protocols/actions';
import {Objective as ObjectiveModel} from '../models/objective';
import {logger} from '../logger';

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

export type ObjectiveStoredInDB = Objective & {
  objectiveId: string;
  status: 'pending' | 'approved' | 'rejected' | 'failed' | 'succeeded';
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export class Store {
  constructor(
    public readonly knex: Knex,
    readonly timingMetrics: boolean,
    readonly skipEvmValidation: boolean
  ) {
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

      setupDBMetrics(this.knex);
    }
  }

  async destroy(): Promise<void> {
    await this.knex.destroy();
  }

  async getFirstParticipant(): Promise<Participant> {
    const signingAddress = await this.getOrCreateSigningAddress();
    return {
      participantId: signingAddress,
      signingAddress,
      destination: makeDestination(constants.HashZero),
    };
  }

  async getOrCreateSigningAddress(): Promise<string> {
    const randomWallet = ethers.Wallet.createRandom();
    // signing_wallets table allows for only one row via database constraints
    try {
      // returning('*') only works with Postgres
      // https://vincit.github.io/objection.js/recipes/returning-tricks.html
      const signingWallet = await SigningWallet.query(this.knex)
        .insert({
          privateKey: randomWallet.privateKey,
          address: randomWallet.address,
        })
        .returning('*');
      return signingWallet.address;
    } catch (error) {
      if (isUniqueViolationError(error)) {
        return (await SigningWallet.query(this.knex).first()).address;
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
    channelId: Bytes32,
    criticalCode: AppHandler<T>,
    onChannelMissing: MissingAppHandler<T> = throwMissingChannel
  ): Promise<T> {
    return this.knex.transaction(async tx => {
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
    tx: Transaction // Insist on a transaction since addSignedState requires it
  ): Promise<SignedState> {
    const timer = timerFactory(this.timingMetrics, `signState ${channelId}`);

    const channel = await timer('getting channel', async () => Channel.forId(channelId, tx));

    const state: StateWithHash = addHash({...channel.channelConstants, ...vars});

    const {supported} = channel;

    await timer('validating freshness', async () => validateStateFreshness(state, channel));

    const signatureEntry = await timer('signing', async () =>
      channel.signingWallet.signState(state)
    );
    const signedState = {...state, signatures: [signatureEntry]};

    if (
      supported &&
      // If the state is the same as the support state then its not a transition just adding signatures
      !statesEqual(supported, state) &&
      !(await timer('validating transition', async () =>
        this.validateTransition(supported, signedState, tx)
      ))
    ) {
      throw new StoreError('Invalid state transition', {
        from: channel.supported,
        to: signedState,
      });
    }

    await timer('adding MY state', async () => this.addMyState(channel, signedState, tx));

    return signedState;
  }

  async addMyState(
    channel: Channel,
    signedState: SignedStateWithHash,
    tx: Transaction
  ): Promise<Channel> {
    if (
      signedState.signatures.length > 1 ||
      signedState.signatures[0].signer !== channel.myAddress
    ) {
      throw new Error('This state not exclusively signed by me');
    }

    const timer = timerFactory(this.timingMetrics, `addMyState ${channel.channelId}`);

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

  async getChannel(channelId: Bytes32, tx?: Transaction): Promise<ChannelState> {
    // This is somewhat faster than Channel.forId for simply fetching a channel:
    // - the signingWallet isn't needed to construct the protocol state
    // - withGraphJoined is slightly faster in this case
    return (
      await Channel.query(tx ?? this.knex)
        .where({'channels.channel_id': channelId})
        .withGraphJoined('funding')
        .first()
    )?.protocolState;
  }

  // Port of the following solidity code
  // https://github.com/statechannels/statechannels/blob/a3d21827e340c0cc086f1abad7685345885bf245/packages/nitro-protocol/contracts/ForceMove.sol#L492-L534
  async validateTransition(
    fromState: SignedState,
    toState: SignedState,
    tx: Transaction
  ): Promise<boolean> {
    const fromMoverIndex = fromState.turnNum % fromState.participants.length;
    const fromMover = fromState.participants[fromMoverIndex].signingAddress;

    const toMoverIndex = toState.turnNum % toState.participants.length;
    const toMover = toState.participants[toMoverIndex].signingAddress;

    const turnNumCheck = _.isEqual(toState.turnNum, fromState.turnNum + 1);
    if (!turnNumCheck) {
      const VALIDATION_ERROR = `Turn number check failed.`;
      logger.error(VALIDATION_ERROR, {fromState, toState, error: Error(VALIDATION_ERROR)});
    }

    const constantsCheck =
      _.isEqual(toState.chainId, fromState.chainId) &&
      _.isEqual(toState.participants, fromState.participants) &&
      _.isEqual(toState.appDefinition, fromState.appDefinition) &&
      _.isEqual(toState.challengeDuration, fromState.challengeDuration);

    if (!constantsCheck) {
      const VALIDATION_ERROR = `Constants check failed.
      )}
      `;

      logger.error(VALIDATION_ERROR, {
        fromState,
        toState,
        error: Error(VALIDATION_ERROR),
      });
    }

    const signatureValidation =
      fromState.signatures.some(s => s.signer === fromMover) &&
      toState.signatures.some(s => s.signer === toMover);

    if (!signatureValidation) {
      const VALIDATION_ERROR = `Signature validation failed.`;
      logger.error(VALIDATION_ERROR, {fromState, toState, error: Error(VALIDATION_ERROR)});
      return false;
    }

    // Final state specific validation
    if (toState.isFinal && !_.isEqual(fromState.outcome, toState.outcome)) {
      const VALIDATION_ERROR = `Outcome changed on a final state.`;
      logger.error(VALIDATION_ERROR, {fromState, toState, error: Error(VALIDATION_ERROR)});
      return false;
    }

    // Funding stage specific validation
    const isInFundingStage = toState.turnNum < 2 * toState.participants.length;
    const fundingStageValidation =
      _.isEqual(fromState.isFinal, false) &&
      _.isEqual(toState.outcome, fromState.outcome) &&
      _.isEqual(toState.appData, fromState.appData);

    if (isInFundingStage && !fundingStageValidation) {
      const VALIDATION_ERROR = `Invalid setup state transition.`;

      logger.error(VALIDATION_ERROR, {fromState, toState, error: Error(VALIDATION_ERROR)});

      return false;
    }

    // Validates app specific rules by running the app rules contract in the EVM
    // We only want to run the validation for states not in the funding stage per the force move contract
    if (!this.skipEvmValidation && !isInFundingStage) {
      const evmValidation = await validateTransitionWithEVM(
        toNitroState(fromState),
        toNitroState(fromState),
        tx
      );
      if (!evmValidation) {
        logger.error('EVM Validation failure', {fromState, toState});
        return false;
      }
    }

    return true;
  }
  async getStates(
    channelId: Bytes32,
    tx?: Transaction
  ): Promise<{states: SignedStateWithHash[]; channelState: ChannelState}> {
    const channel = await Channel.forId(channelId, tx || this.knex);

    if (!channel) throw new StoreError(StoreError.reasons.channelMissing);

    const {vars, channelConstants, protocolState: channelState} = channel;
    return {states: vars.map(ss => _.merge(ss, channelConstants)), channelState};
  }

  async getChannels(): Promise<ChannelState[]> {
    return (await Channel.query(this.knex)).map(channel => channel.protocolState);
  }

  async pushMessage(
    message: WirePayload
  ): Promise<{
    channelIds: Bytes32[];
    objectives: ObjectiveStoredInDB[];
    channelResults: ChannelResult[];
  }> {
    return this.knex.transaction(async tx => {
      const channelResults: ChannelResult[] = [];

      // Sorted to ensure channel nonces arrive in ascending order
      const sortedSignedStates = (message.signedStates || []).sort(
        (a, b) => a.channelNonce - b.channelNonce
      );

      const stateChannelIds = message.signedStates?.map(ss => ss.channelId) || [];
      for (const ss of sortedSignedStates || []) {
        channelResults.push(
          (await this.addSignedState(ss.channelId, undefined, ss, tx)).channelResult
        );
      }

      const deserializedObjectives = message.objectives?.map(deserializeObjective) || [];
      const storedObjectives = [];
      for (const o of deserializedObjectives) {
        storedObjectives.push(await this.addObjective(o, tx));
      }

      function isDefined(s: string | undefined): s is string {
        return s !== undefined;
      }
      const objectiveChannelIds =
        storedObjectives
          .map(objective => (isOpenChannel(objective) ? objective.data.targetChannelId : undefined))
          .filter(isDefined) || [];

      return {
        channelIds: stateChannelIds.concat(objectiveChannelIds),
        objectives: storedObjectives.filter(o => o.status === 'pending'),
        channelResults,
      };
    });
  }

  async addObjective(objective: Objective, tx: Transaction): Promise<ObjectiveStoredInDB> {
    if (isOpenChannel(objective)) {
      const {
        data: {targetChannelId: channelId, fundingStrategy},
      } = objective;

      // fetch the channel to make sure the channel exists
      const channel = await Channel.forId(channelId, tx);
      if (!channel) {
        throw new StoreError(StoreError.reasons.channelMissing, {channelId});
      }

      if (!_.includes(['Ledger', 'Direct', 'Unfunded'], objective.data.fundingStrategy))
        throw new StoreError(StoreError.reasons.unimplementedFundingStrategy, {fundingStrategy});

      const objectiveToBeStored: ObjectiveStoredInDB = {
        objectiveId: objectiveId(objective),
        participants: [],
        status: 'pending',
        type: objective.type,
        data: {
          fundingStrategy,
          targetChannelId: channelId,
        },
      };

      // TODO: (Stored Objectives) Does it make sense to do the INSERT here?
      await ObjectiveModel.insert(objectiveToBeStored, tx);

      await Channel.query(tx)
        .where({channelId: channel.channelId})
        .patch({fundingStrategy})
        .returning('*')
        .first();

      return objectiveToBeStored;
    } else if (objective.type === 'CloseChannel') {
      const {
        data: {targetChannelId, fundingStrategy},
      } = objective;
      // fetch the channel to make sure the channel exists
      const channel = await Channel.forId(targetChannelId, tx);
      if (!channel) {
        throw new StoreError(StoreError.reasons.channelMissing, {channelId: targetChannelId});
      }

      const objectiveToBeStored: ObjectiveStoredInDB = {
        objectiveId: objectiveId(objective),
        status: 'approved', // TODO: (Stored Objectives) Awkward that it 'auto-approves'... :S
        type: objective.type,
        participants: [],
        data: {
          targetChannelId,
          fundingStrategy,
        },
      };
      // TODO: (Stored Objectives) Does it make sense to do the INSERT here?
      await ObjectiveModel.insert(objectiveToBeStored, tx);

      return objectiveToBeStored;
    } else {
      throw new StoreError(StoreError.reasons.unimplementedObjective);
    }
  }

  async addSignedState(
    channelId: string,
    maybeChannel: Channel | undefined,
    wireSignedState: WireSignedState,
    tx: Transaction // Insist on a transaction because validateTransitionWIthEVM requires it
  ): Promise<Channel> {
    const timer = timerFactory(this.timingMetrics, `add signed state ${channelId}`);

    const signatures = await timer(
      'validating signatures',
      async () =>
        await recoverParticipantSignatures(
          wireSignedState.signatures,
          wireSignedState.participants.map(p => p.signingAddress),
          channelId,
          wireStateToNitroState(wireSignedState)
        )
    );

    maybeChannel =
      maybeChannel || (await timer('get channel', async () => getChannel(channelId, tx)));

    if (!maybeChannel)
      (
        await Nonce.fromJson({
          value: wireSignedState.channelNonce,
          addresses: wireSignedState.participants.map(p => p.signingAddress),
        })
      ).use(tx);

    const channel =
      maybeChannel ||
      (await createChannel(
        {
          ...wireSignedState,
          participants: wireSignedState.participants.map(convertToParticipant),
        },
        'Unknown',
        tx
      ));

    const incomingState = deserializeState(wireSignedState);
    if (
      channel.supported &&
      // If the state is the same as the support state then its not a transition just adding signatures
      !statesEqual(channel.supported, incomingState)
    ) {
      const {supported} = channel;

      if (
        !(await timer('validating transition', async () =>
          this.validateTransition(supported, incomingState, tx)
        ))
      ) {
        logger.error('Invalid state transition — state is stored but not supported', {
          from: channel.supported,
          to: wireSignedState,
        });
      }
    }

    const sswh: SignedStateWithHash = addHash({
      chainId: wireSignedState.chainId,
      channelNonce: wireSignedState.channelNonce,
      appDefinition: wireSignedState.appDefinition,
      appData: wireSignedState.appData,
      turnNum: wireSignedState.turnNum,
      isFinal: wireSignedState.isFinal,
      challengeDuration: wireSignedState.challengeDuration,
      outcome: deserializeOutcome(wireSignedState.outcome),
      participants: wireSignedState.participants.map(convertToInternalParticipant),
      signatures,
    });
    channel.vars = await timer('adding state', async () => addState(channel.vars, sswh));

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

  async createChannel(
    constants: ChannelConstants,
    appData: Bytes,
    outcome: Outcome,
    fundingStrategy: FundingStrategy
  ): Promise<{outgoing: Outgoing[]; channelResult: ChannelResult}> {
    return await this.knex.transaction(async tx => {
      const {channelId, myIndex, participants} = await createChannel(
        constants,
        fundingStrategy,
        tx
      );
      const signedState = await this.signState(
        channelId,
        {
          ...constants,
          turnNum: 0,
          isFinal: false,
          appData,
          outcome,
        },
        tx
      );

      /** todo:
       * What happens if Bob is adding his signature to prefund0 from Alice?
       * In this case Bob will send an objective to Alice
       */

      const objective: Objective = {
        type: 'OpenChannel',
        participants,
        data: {
          targetChannelId: channelId,
          fundingStrategy,
        },
      };

      const data: Payload = {
        signedStates: [signedState],
        objectives: [objective],
      };

      const notMe = (_p: any, i: number): boolean => i !== myIndex;

      const outgoing = participants.filter(notMe).map(({participantId: recipient}) => ({
        method: 'MessageQueued' as const,
        params: serializeMessage(data, recipient, participants[myIndex].participantId, channelId),
      }));

      const objectiveToBeStored: ObjectiveStoredInDB = {
        ...objective,
        objectiveId: objectiveId(objective),
        status: 'approved',
      };

      if (isOpenChannel(objective)) await ObjectiveModel.insert(objectiveToBeStored, tx);

      return {outgoing, channelResult: toChannelResult(await this.getChannel(channelId, tx))};
    });
  }

  async updateFunding(
    channelId: string,
    fromAmount: Uint256,
    assetHolderAddress: Address
  ): Promise<void> {
    await Funding.updateFunding(this.knex, channelId, fromAmount, assetHolderAddress);
  }

  async nextNonce(signingAddresses: Address[]): Promise<number> {
    return await Nonce.next(this.knex, signingAddresses);
  }
}

class StoreError extends WalletError {
  readonly type = WalletError.errors.StoreError;

  static readonly reasons = {
    duplicateChannel: 'Expected the channel to NOT exist in the database',
    notSorted: 'states not sorted',
    multipleSignedStates: 'Store signed multiple states for a single turn',
    invalidSignature: 'Invalid signature',
    notInChannel: 'Not in channel',
    staleState: 'Stale state',
    missingSigningKey: 'Missing a signing key',
    invalidTransition: 'Invalid state transition',
    channelMissing: 'Channel not found',
    unimplementedObjective: 'Unimplemented objective',
    unimplementedFundingStrategy: 'Unimplemented funding strategy',
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
  channelId: string,
  txOrKnex: TransactionOrKnex
): Promise<Channel | undefined> {
  try {
    return await Channel.forId(channelId, txOrKnex);
  } catch (err) {
    if (!isChannelMissingError) throw err;
    return undefined;
  }
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

async function recoverParticipantSignatures(
  signatures: string[],
  participants: string[],
  channelId: string,
  nitroState: NitroState
): Promise<SignatureEntry[]> {
  return Promise.all(
    signatures.map(async sig => {
      const recoveredAddress = await recoverAddress(sig, nitroState);

      if (participants.indexOf(recoveredAddress) < 0) {
        throw new Error(
          `Recovered address ${recoveredAddress} is not a participant in channel ${channelId}`
        );
      }
      return {signature: sig, signer: recoveredAddress};
    })
  );
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
