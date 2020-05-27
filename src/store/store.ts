import {AddressZero} from '@ethersproject/constants';
import {EventEmitter} from 'eventemitter3';
import {filter, map, concatAll} from 'rxjs/operators';
import {Observable, fromEvent, merge, from, of} from 'rxjs';
import {Wallet, BigNumber} from 'ethers';
import * as _ from 'lodash';
import AsyncLock from 'async-lock';

import {Chain, FakeChain} from '../chain';
import {CHAIN_NETWORK_ID, HUB} from '../config';
import {checkThat, isSimpleEthAllocation, recordToArray} from '../utils';

import {calculateChannelId, hashState} from './state-utils';
import {ChannelStoreEntry} from './channel-store-entry';
import {MemoryBackend} from './memory-backend';
import {Errors, Outcome} from '.';
import {
  ChannelStoredData,
  DBBackend,
  Message,
  Objective,
  Participant,
  SignedState,
  DomainBudget,
  State,
  StateVariables,
  ObjectStores,
  SimpleAllocation
} from './types';
import {logger} from '../logger';

interface DirectFunding {
  type: 'Direct';
}

interface IndirectFunding {
  type: 'Indirect';
  ledgerId: string;
}

export interface VirtualFunding {
  type: 'Virtual';
  jointChannelId: string;
}

interface Guarantee {
  type: 'Guarantee';
  guarantorChannelId: string;
}

interface Guarantees {
  type: 'Guarantees';
  guarantorChannelIds: [string, string];
}

export type Funding = DirectFunding | IndirectFunding | VirtualFunding | Guarantees | Guarantee;
export function isIndirectFunding(funding: Funding): funding is IndirectFunding {
  return funding.type === 'Indirect';
}

export function isVirtualFunding(funding: Funding): funding is VirtualFunding {
  return funding.type === 'Virtual';
}

export function isGuarantee(funding: Funding): funding is Guarantee {
  return funding.type === 'Guarantee';
}
export function isGuarantees(funding: Funding): funding is Guarantees {
  return funding.type === 'Guarantees';
}

interface InternalEvents {
  channelUpdated: [ChannelStoreEntry];
  newObjective: [Objective];
  addToOutbox: [Message];
  lockUpdated: [ChannelLock];
}
export type ChannelLock = {
  channelId: string;
  release: () => void;
};

export class Store {
  protected backend: DBBackend = new MemoryBackend();
  readonly chain: Chain;
  private _eventEmitter = new EventEmitter<InternalEvents>();
  private objectives: Objective[] = [];

  constructor(chain?: Chain, backend?: DBBackend) {
    // TODO: We shouldn't default to a fake chain
    // but I didn't feel like updating all the constructor calls
    this.chain = chain || new FakeChain();
    this.chain.initialize();
    if (backend) {
      this.backend = backend;
    }
  }

  public initialize = async (
    privateKeys?: string[],
    cleanSlate = false,
    dbName = 'xstatewallet'
  ) => {
    await this.backend.initialize(cleanSlate, dbName);

    await this.backend.transaction('readwrite', [ObjectStores.privateKeys], async () => {
      if (!privateKeys?.length && !(await this.getAddress())) {
        // generate the first private key
        const {privateKey} = Wallet.createRandom();
        privateKeys = [privateKey];
      }

      await Promise.all(
        privateKeys?.map(pk => this.backend.setPrivateKey(new Wallet(pk).address, pk)) || []
      );
    });
  };

  public async getBudget(domain: string): Promise<DomainBudget | undefined> {
    return this.backend.getBudget(domain);
  }

  public channelUpdatedFeed(channelId: string): Observable<ChannelStoreEntry> {
    // TODO: The following line is not actually type safe.
    // fromEvent<'foo'>(this._eventEmitter, 'channelUpdated') would happily return
    // Observable<'foo'>
    const newEntries = fromEvent<ChannelStoreEntry>(this._eventEmitter, 'channelUpdated').pipe(
      filter(cs => cs.channelId === channelId)
    );

    const currentEntry = from(this.backend.getChannel(channelId)).pipe(
      filter<ChannelStoreEntry>(c => !!c)
    );

    return merge(currentEntry, newEntries);
  }

  get objectiveFeed(): Observable<Objective> {
    const newObjectives = fromEvent<Objective>(this._eventEmitter, 'newObjective');
    const currentObjectives = of(this.objectives).pipe(concatAll());

    return merge(newObjectives, currentObjectives);
  }

  get outboxFeed(): Observable<Message> {
    return fromEvent(this._eventEmitter, 'addToOutbox');
  }

  private initializeChannel = (
    state: State,
    applicationDomain?: string
  ): Promise<ChannelStoreEntry> =>
    this.backend.transaction(
      'readwrite',
      [ObjectStores.privateKeys, ObjectStores.nonces, ObjectStores.channels],
      async () => {
        const addresses = state.participants.map(x => x.signingAddress);
        const privateKeys = await this.backend.privateKeys();
        const myIndex = addresses.findIndex(address => !!privateKeys[address]);
        if (myIndex === -1) throw Error(Errors.notInChannel);

        await this.setNonce(addresses, state.channelNonce);

        const data: ChannelStoredData = {
          channelConstants: state,
          stateVariables: [{...state, stateHash: hashState(state), signatures: []}],
          myIndex,
          funding: undefined,
          applicationDomain
        };

        await this.backend.setChannel(calculateChannelId(state), data);
        return new ChannelStoreEntry(data);
      }
    );

  public setFunding = (channelId: string, funding: Funding) =>
    this.backend.transaction('readwrite', [ObjectStores.channels], async () => {
      const channelEntry = await this.getEntry(channelId);

      if (channelEntry.funding) {
        logger.error({funding: channelEntry.funding}, 'Channel %s already funded', channelId);
        throw Error(Errors.channelFunded);
      }
      channelEntry.setFunding(funding);

      await this.backend.setChannel(channelEntry.channelId, channelEntry.data());
    });

  private ledgerLock = new AsyncLock();
  public async acquireChannelLock(channelId: string): Promise<ChannelLock> {
    return new Promise(resolve =>
      // TODO: Does this need a timeout?
      this.ledgerLock.acquire(channelId, release => resolve({release, channelId}))
    );
  }

  public getLedger = async (peerId: string) =>
    this.backend.transaction(
      'readonly',
      [ObjectStores.ledgers, ObjectStores.channels],
      async () => {
        const ledgerId = await this.backend.getLedger(peerId);
        if (!ledgerId) throw Error(Errors.noLedger + `: ${peerId}`);

        return await this.getEntry(ledgerId);
      }
    );

  public setapplicationDomain = (channelId: string, applicationDomain: string) =>
    this.backend.transaction('readwrite', [ObjectStores.channels], async () => {
      const entry = await this.getEntry(channelId);

      if (typeof entry.applicationDomain === 'string') throw Error(Errors.domainExistsOnChannel);

      await this.backend.setChannel(channelId, {...entry.data(), applicationDomain});
    });

  public setLedger = (ledgerId: string) =>
    this.backend.transaction(
      'readwrite',
      [ObjectStores.ledgers, ObjectStores.channels, ObjectStores.privateKeys],
      async () => {
        const entry = await this.getEntry(ledgerId);

        // This is not on the Store interface itself -- it is useful to set up a test store
        await this.backend.setChannel(entry.channelId, entry.data());
        const address = await this.getAddress();
        const hub = entry.participants.find(p => p.signingAddress !== address) as Participant;
        await this.backend.setLedger(hub.participantId, entry.channelId);
      }
    );

  public getApplicationChannels = (applicationDomain: string, includeClosed = false) =>
    this.backend.transaction('readonly', [ObjectStores.channels], async () =>
      recordToArray(await this.backend.channels()).filter(
        channel =>
          !!channel &&
          channel.applicationDomain === applicationDomain &&
          (!channel.hasConclusionProof || includeClosed) &&
          !BigNumber.from(channel.channelConstants.appDefinition).isZero()
      )
    );

  public createChannel = (
    participants: Participant[],
    challengeDuration: BigNumber,
    stateVars: StateVariables,
    appDefinition = AddressZero,
    applicationDomain?: string
  ) =>
    this.backend
      .transaction(
        'readwrite',
        [ObjectStores.privateKeys, ObjectStores.nonces, ObjectStores.channels],
        async () => {
          stateVars = _.pick(stateVars, 'outcome', 'turnNum', 'appData', 'isFinal');
          const addresses = participants.map(x => x.signingAddress);
          const privateKeys = await this.backend.privateKeys();
          const myIndex = addresses.findIndex(address => !!privateKeys[address]);
          if (myIndex === -1) {
            throw Error(Errors.notInChannel);
          }

          const channelNonce = (await this.getNonce(addresses)).add(1);
          const chainId = CHAIN_NETWORK_ID;

          const entry = await this.initializeChannel(
            {
              chainId,
              challengeDuration,
              channelNonce,
              participants,
              appDefinition,
              ...stateVars
            },
            applicationDomain
          );
          return this.signAndAddStateWithinTx(entry.channelId, stateVars);
        }
      )
      .then(({entry, signedState}) => this.emitChannelUpdatedEventAfterTX(entry, signedState));

  private async getNonce(addresses: string[]): Promise<BigNumber> {
    const nonce = await this.backend.getNonce(this.nonceKeyFromAddresses(addresses));
    return nonce || BigNumber.from(-1);
  }

  private async setNonce(addresses: string[], value: BigNumber) {
    // TODO: Figure out why the lte check is failing
    if (value.lt(await this.getNonce(addresses))) throw Error(Errors.invalidNonce);

    await this.backend.setNonce(this.nonceKeyFromAddresses(addresses), value);
  }

  private nonceKeyFromAddresses = (addresses: string[]): string => addresses.join('::');

  public async getPrivateKey(signingAddress: string): Promise<string> {
    const ret = await this.backend.getPrivateKey(signingAddress);
    if (!ret) throw Error(Errors.cannotFindPrivateKey);
    return ret;
  }

  public updateChannel = (
    channelId: string,
    updateData: Partial<{outcome: SimpleAllocation; appData: string; isFinal: boolean}>
  ) =>
    this.backend
      .transaction('readwrite', [ObjectStores.channels, ObjectStores.privateKeys], async () => {
        const {supported: existingState, myTurn} = await this.getEntry(channelId);
        if (!myTurn) {
          logger.error({channelId, updateData, existingState}, 'Updating channel when not my turn');
          throw Error(Errors.notMyTurn);
        }

        const newState = _.merge(existingState, {
          turnNum: existingState.turnNum.add(1),
          ...updateData
        });

        return this.signAndAddStateWithinTx(channelId, newState);
      })
      .then(({entry, signedState}) => this.emitChannelUpdatedEventAfterTX(entry, signedState));

  public signFinalState = (channelId: string) =>
    this.backend
      .transaction('readwrite', [ObjectStores.channels, ObjectStores.privateKeys], async () => {
        const {supported, latestSignedByMe} = await this.getEntry(channelId);
        if (!supported.isFinal) throw new Error('Supported state not final');
        if (latestSignedByMe.turnNum.eq(supported.turnNum)) return; // already signed
        return await this.signAndAddStateWithinTx(channelId, supported);
      })
      .then(result => {
        if (result) this.emitChannelUpdatedEventAfterTX(result.entry, result.signedState);
      });

  private emitChannelUpdatedEventAfterTX(entry: ChannelStoreEntry, signedState?: SignedState) {
    // These events trigger callbacks that should not run within the transaction scope
    // See https://github.com/dfahlander/Dexie.js/issues/1029

    if (this.backend.transactionOngoing) throw Error(Errors.emittingDuringTransaction);

    this._eventEmitter.emit('channelUpdated', entry);
    if (signedState) this._eventEmitter.emit('addToOutbox', {signedStates: [signedState]});

    return entry;
  }

  public signAndAddState = (channelId: string, stateVars: StateVariables) =>
    this.signAndAddStateWithinTx(channelId, stateVars).then(({entry, signedState}) =>
      this.emitChannelUpdatedEventAfterTX(entry, signedState)
    );

  public supportState = (state: State) =>
    this.backend
      .transaction('readwrite', [ObjectStores.channels, ObjectStores.privateKeys], async () => {
        const stateHash = hashState(state);
        const channelId = calculateChannelId(state);
        const entry = await this.getEntry(channelId);
        const {isSupportedByMe} = entry;

        // We only sign the state if we haven't signed it already
        if (!isSupportedByMe || entry.latestSignedByMe.stateHash !== stateHash) {
          return await this.signAndAddStateWithinTx(channelId, state);
        } else {
          // The support state machine was started with a state that we already support
          // That's fine but we output a warning in case that's unexpected
          logger.warn({state}, 'The state is already supported');
          return;
        }
      })
      .then(args => {
        if (!args) return;
        this.emitChannelUpdatedEventAfterTX(args.entry, args.signedState);
      });

  private signAndAddStateWithinTx = (channelId: string, stateVars: StateVariables) =>
    this.backend.transaction(
      'readwrite',
      [ObjectStores.channels, ObjectStores.privateKeys],
      async () => {
        const entry = await this.getEntry(channelId);

        const signedState = entry.signAndAdd(
          _.pick(stateVars, 'outcome', 'turnNum', 'appData', 'isFinal'),
          await this.getPrivateKey(entry.myAddress)
        );
        await this.backend.setChannel(channelId, entry.data());
        return {entry, signedState};
      }
    );

  async addObjective(objective: Objective, addToOutbox = true) {
    const objectives = this.objectives;
    if (!_.find(objectives, o => _.isEqual(o, objective))) {
      this.objectives.push(objective);
      addToOutbox && this._eventEmitter.emit('addToOutbox', {objectives: [objective]});
      this._eventEmitter.emit('newObjective', objective);
    }
  }

  public addState = (state: SignedState) =>
    this.backend
      .transaction(
        'readwrite',
        [ObjectStores.channels, ObjectStores.nonces, ObjectStores.privateKeys],
        async () => {
          const channelId = calculateChannelId(state);
          const memoryChannelStorage =
            (await this.backend.getChannel(channelId)) || (await this.initializeChannel(state));
          // TODO: This is kind of awkward
          state.signatures.forEach(sig => memoryChannelStorage.addState(state, sig));
          await this.backend.setChannel(channelId, memoryChannelStorage.data());
          return memoryChannelStorage;
        }
      )
      .then(entry => this.emitChannelUpdatedEventAfterTX(entry));

  public async getAddress(): Promise<string> {
    const privateKeys = await this.backend.privateKeys();
    return Object.keys(privateKeys)[0];
  }

  async pushMessage(message: Message) {
    await Promise.all(message.signedStates?.map(signedState => this.addState(signedState)) || []);
    message.objectives?.map(o => this.addObjective(o, false));
  }

  public async getEntry(channelId: string): Promise<ChannelStoreEntry> {
    const entry = await this.backend.getChannel(channelId);
    if (!entry) {
      logger.error('Channel %s not found', channelId);
      throw Error(Errors.channelMissing);
    }

    return entry;
  }

  public createBudget = (budget: DomainBudget) =>
    this.backend.transaction('readwrite', [ObjectStores.budgets], async tx => {
      const existingBudget = await this.backend.getBudget(budget.domain);
      if (existingBudget) {
        logger.error(Errors.budgetAlreadyExists);
        tx.abort();
      }

      await this.backend.setBudget(budget.domain, budget);
    });

  public clearBudget = domain =>
    this.backend.transaction('readwrite', [ObjectStores.budgets], () =>
      this.backend.deleteBudget(domain)
    );

  public releaseFunds = (
    assetHolderAddress: string,
    ledgerChannelId: string,
    targetChannelId: string
  ) =>
    this.backend.transaction(
      'readwrite',
      [ObjectStores.budgets, ObjectStores.channels, ObjectStores.privateKeys],
      async () => {
        const {applicationDomain, supported, participants} = await this.getEntry(ledgerChannelId);
        const {outcome} = supported;
        if (typeof applicationDomain !== 'string') throw Error(Errors.noDomainForChannel);

        const currentBudget = await this.getBudget(applicationDomain);

        const assetBudget = currentBudget?.forAsset[assetHolderAddress];

        if (!currentBudget || !assetBudget) throw Error(Errors.noBudget);

        const channelBudget = assetBudget.channels[targetChannelId];
        if (!channelBudget) throw Error(Errors.channelNotInBudget);
        const playerAddress = await this.getAddress();

        const playerDestination = participants.find(p => p.signingAddress === playerAddress)
          ?.destination;
        if (!playerDestination) {
          throw Error(Errors.cannotFindDestination);
        }
        // Simply set the budget to the current ledger outcome
        assetBudget.availableSendCapacity = getAllocationAmount(outcome, playerDestination);
        assetBudget.availableReceiveCapacity = getAllocationAmount(outcome, HUB.destination);

        // Delete the funds assigned to the channel
        delete assetBudget.channels[targetChannelId];

        const result = await this.backend.setBudget(applicationDomain, currentBudget);
        return result;
      }
    );

  public reserveFunds = (
    assetHolderAddress: string,
    channelId: string,
    amount: {send: BigNumber; receive: BigNumber}
  ) =>
    this.backend.transaction(
      'readwrite',
      [ObjectStores.budgets, ObjectStores.channels],
      async () => {
        const entry = await this.getEntry(channelId);
        const domain = entry.applicationDomain;
        if (typeof domain !== 'string') throw Error(Errors.noDomainForChannel + ' ' + channelId);
        const currentBudget = await this.backend.getBudget(domain);

        // TODO?: Create a new budget if one doesn't exist
        if (!currentBudget) throw Error(Errors.noBudget + domain);

        const assetBudget = currentBudget?.forAsset[assetHolderAddress];
        if (!assetBudget) throw Error(Errors.noAssetBudget);

        if (
          assetBudget.availableSendCapacity.lt(amount.send) ||
          assetBudget.availableReceiveCapacity.lt(amount.receive)
        ) {
          throw Error(Errors.budgetInsufficient);
        }

        currentBudget.forAsset[assetHolderAddress] = {
          ...assetBudget,
          channels: {
            ...assetBudget.channels,
            [channelId]: {amount: amount.send.add(amount.receive)}
          }
        };
        this.backend.setBudget(currentBudget.domain, currentBudget);

        return currentBudget;
      }
    );
}

export function supportedStateFeed(store: Store, channelId: string) {
  return store.channelUpdatedFeed(channelId).pipe(
    filter(e => e.isSupported),
    map(({supported}) => ({state: supported}))
  );
}

function getAllocationAmount(outcome: Outcome, destination: string) {
  const {allocationItems} = checkThat(outcome, isSimpleEthAllocation);
  const amount = allocationItems.find(a => a.destination === destination)?.amount;
  if (!amount) throw Error(Errors.amountNotFound + ` ${destination}`);

  return amount;
}
