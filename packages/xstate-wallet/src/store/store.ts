import {AddressZero} from 'ethers/constants';
import {BigNumber, bigNumberify} from 'ethers/utils';
import {EventEmitter} from 'eventemitter3';
import {filter, map, concatAll} from 'rxjs/operators';
import {Guid} from 'guid-typescript';
import {Observable, fromEvent, merge, from, of} from 'rxjs';
import {Wallet} from 'ethers';
import * as _ from 'lodash';

import {Chain, FakeChain} from '../chain';
import {NETWORK_ID, HUB} from '../constants';
import {checkThat, isSimpleEthAllocation} from '../utils';

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
  SiteBudget,
  State,
  StateVariables,
  ObjectStores
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

const LOCK_TIMEOUT = 3000;
interface InternalEvents {
  channelUpdated: [ChannelStoreEntry];
  newObjective: [Objective];
  addToOutbox: [Message];
  lockUpdated: [ChannelLock];
}
export interface Store {
  // Feeds
  objectiveFeed: Observable<Objective>;
  outboxFeed: Observable<Message>;
  channelUpdatedFeed(channelId: string): Observable<ChannelStoreEntry>;

  /* Core Channels API */
  // Write
  pushMessage: (message: Message) => Promise<void>;
  signAndAddState(channelId: string, stateVars: StateVariables): Promise<void>;
  createChannel(
    participants: Participant[],
    challengeDuration: BigNumber,
    stateVars: StateVariables,
    appDefinition?: string,
    applicationSite?: string
  ): Promise<ChannelStoreEntry>;
  // Read
  getAddress(): Promise<string>;
  getEntry(channelId): Promise<ChannelStoreEntry>;
  getPrivateKey(signingAddress: string): Promise<string>;

  /* Locking API */
  lockFeed: Observable<ChannelLock>;
  acquireChannelLock(channelId: string): Promise<ChannelLock>;
  releaseChannelLock(lock: ChannelLock): Promise<void>;

  getLedger(peerId: string): Promise<ChannelStoreEntry>;
  setLedger(ledgerId: string): Promise<void>;

  setApplicationSite(channelId: string, applicationSite: string): Promise<void>;
  addObjective(objective: Objective): void;

  /* Environmental API (browser-specific) */
  setFunding(channelId: string, funding: Funding): Promise<void>;
  getBudget: (site: string) => Promise<SiteBudget | undefined>;
  createBudget: (budget: SiteBudget) => Promise<void>;
  clearBudget: (site: string) => Promise<void>;
  reserveFunds(
    assetHolderAddress: string,
    channelId: string,
    amount: {send: BigNumber; receive: BigNumber}
  ): Promise<SiteBudget>;
  releaseFunds(
    assetHolderAddress: string,
    ledgerChannelId: string,
    targetChannelId: string
  ): Promise<SiteBudget>;

  chain: Chain;

  initialize(privateKeys?: string[], cleanSlate?: boolean): Promise<void>;
}

export type ChannelLock = {
  channelId: string;
  lock?: Guid;
};

export class XstateStore implements Store {
  protected backend: DBBackend = new MemoryBackend();
  readonly chain: Chain;
  private _eventEmitter = new EventEmitter<InternalEvents>();
  protected _channelLocks: Record<string, Guid | undefined> = {};
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

  public async initialize(privateKeys?: string[], cleanSlate = false) {
    await this.backend.initialize(cleanSlate);

    if (privateKeys && privateKeys.length > 0) {
      // load existing keys
      privateKeys.forEach(async key => {
        const wallet = new Wallet(key);
        await this.backend.setPrivateKey(wallet.address, wallet.privateKey);
      });
    } else if (!(await this.getAddress())) {
      // generate the first private key
      const wallet = Wallet.createRandom();
      await this.backend.setPrivateKey(wallet.address, wallet.privateKey);
    }
  }

  public async getBudget(site: string): Promise<SiteBudget | undefined> {
    return this.backend.getBudget(site);
  }

  public channelUpdatedFeed(channelId: string): Observable<ChannelStoreEntry> {
    // TODO: The following line is not actually type safe.
    // fromEvent<'foo'>(this._eventEmitter, 'channelUpdated') would happily return
    // Observable<'foo'>
    const newEntries = fromEvent<ChannelStoreEntry>(this._eventEmitter, 'channelUpdated').pipe(
      filter(cs => cs.channelId === channelId)
    );

    const currentEntry = from(this.backend.getChannel(channelId)).pipe(
      filter<ChannelStoredData>(c => !!c),
      map(c => new ChannelStoreEntry(c))
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

  private async initializeChannel(
    state: State,
    applicationSite?: string
  ): Promise<ChannelStoreEntry> {
    const addresses = state.participants.map(x => x.signingAddress);
    const privateKeys = await this.backend.privateKeys();
    const myIndex = addresses.findIndex(address => !!privateKeys[address]);
    if (myIndex === -1) {
      throw new Error("Couldn't find the signing key for any participant in wallet.");
    }

    const channelId = calculateChannelId(state);

    // TODO: There could be concurrency problems which lead to entries potentially being overwritten.
    await this.setNonce(addresses, state.channelNonce);

    const data: ChannelStoredData = {
      channelConstants: state,
      stateVariables: [{...state, stateHash: hashState(state), signatures: []}],
      myIndex,
      funding: undefined,
      applicationSite
    };
    await this.backend.setChannel(channelId, data);
    return new ChannelStoreEntry(data);
  }

  public setFunding = (channelId: string, funding: Funding) =>
    this.backend.transaction('readwrite', [ObjectStores.channels], async () => {
      const channelData = await this.backend.getChannel(channelId);
      if (!channelData) {
        logger.error('Channel %s not found', channelId);
        throw Error(Errors.channelMissing);
      }

      const channelEntry = new ChannelStoreEntry(channelData);
      if (channelEntry.funding) {
        logger.error({funding: channelEntry.funding}, 'Channel %s already funded', channelId);
        throw Error(Errors.channelFunded);
      }
      channelEntry.setFunding(funding);

      await this.backend.setChannel(channelEntry.channelId, channelEntry.data());
    });

  public async acquireChannelLock(channelId: string): Promise<ChannelLock> {
    const lock = this._channelLocks[channelId];
    if (lock) throw new Error(Errors.channelLocked);

    const newStatus = {channelId, lock: Guid.create()};
    this._channelLocks[channelId] = newStatus.lock;

    setTimeout(async () => {
      try {
        await this.releaseChannelLock(newStatus);
      } finally {
        // NO OP
      }
    }, LOCK_TIMEOUT);
    this._eventEmitter.emit('lockUpdated', newStatus);

    return newStatus;
  }

  public async releaseChannelLock(status: ChannelLock): Promise<void> {
    if (!status.lock) throw new Error('Invalid lock');

    const {channelId, lock} = status;
    const currentStatus = this._channelLocks[channelId];
    if (!currentStatus) return;
    if (!currentStatus.equals(lock)) throw new Error('Invalid lock');
    const newStatus = {channelId, lock: undefined};
    this._channelLocks[channelId] = undefined;
    this._eventEmitter.emit('lockUpdated', newStatus);
  }

  public get lockFeed(): Observable<ChannelLock> {
    return merge(
      from(_.map(this._channelLocks, (lock: Guid, channelId) => ({lock, channelId}))),
      fromEvent<ChannelLock>(this._eventEmitter, 'lockUpdated')
    );
  }

  public async getLedger(peerId: string) {
    const ledgerId = await this.backend.getLedger(peerId);

    if (!ledgerId) throw new Error(`No ledger exists with peer ${peerId}`);

    return await this.getEntry(ledgerId);
  }

  public setApplicationSite = (channelId: string, applicationSite: string) =>
    this.backend.transaction('readwrite', [ObjectStores.channels], async () => {
      const entry = await this.getEntry(channelId);

      if (typeof entry.applicationSite === 'string') throw new Error(Errors.siteExistsOnChannel);

      await this.backend.setChannel(channelId, {...entry.data(), applicationSite});
    });

  public setLedger = (ledgerId: string) =>
    this.backend.transaction(
      'readwrite',
      [ObjectStores.ledgers, ObjectStores.channels],
      async () => {
        const data = await this.backend.getChannel(ledgerId);
        if (!data) {
          throw new Error(`No channel found with channel id ${ledgerId}`);
        }
        const entry = new ChannelStoreEntry(data);
        // This is not on the Store interface itself -- it is useful to set up a test store
        await this.backend.setChannel(entry.channelId, entry.data());
        const address = await this.getAddress();
        const peerId = entry.participants.find(p => p.signingAddress !== address);
        if (peerId) await this.backend.setLedger(peerId.participantId, entry.channelId);
        else throw 'No peer';
      }
    );

  public async createChannel(
    participants: Participant[],
    challengeDuration: BigNumber,
    stateVars: StateVariables,
    appDefinition = AddressZero,
    applicationSite?: string
  ): Promise<ChannelStoreEntry> {
    const addresses = participants.map(x => x.signingAddress);
    const privateKeys = await this.backend.privateKeys();
    const myIndex = addresses.findIndex(address => !!privateKeys[address]);
    if (myIndex === -1) {
      throw new Error("Couldn't find the signing key for any participant in wallet.");
    }

    const channelNonce = (await this.getNonce(addresses)).add(1);
    const chainId = NETWORK_ID;

    const entry = await this.initializeChannel(
      {
        chainId,
        challengeDuration,
        channelNonce,
        participants,
        appDefinition,
        ...stateVars
      },
      applicationSite
    );
    // sign the state, store the channel
    await this.signAndAddState(
      entry.channelId,
      _.pick(stateVars, 'outcome', 'turnNum', 'appData', 'isFinal')
    );

    return entry;
  }
  private async getNonce(addresses: string[]): Promise<BigNumber> {
    const nonce = await this.backend.getNonce(this.nonceKeyFromAddresses(addresses));
    return nonce || bigNumberify(-1);
  }

  private async setNonce(addresses: string[], value: BigNumber) {
    const nonce = await this.getNonce(addresses);
    // TODO: Figure out why the lte check is failing
    if (value.lt(nonce)) {
      throw 'Invalid nonce';
    }
    await this.backend.setNonce(this.nonceKeyFromAddresses(addresses), value);
  }

  private nonceKeyFromAddresses = (addresses: string[]): string => addresses.join('::');

  public async getPrivateKey(signingAddress: string): Promise<string> {
    const ret = await this.backend.getPrivateKey(signingAddress);
    if (!ret) throw new Error('No longer have private key');
    return ret;
  }

  public signAndAddState = (channelId: string, stateVars: StateVariables) =>
    this.backend.transaction(
      'readwrite',
      [ObjectStores.channels, ObjectStores.privateKeys],
      async () => {
        const channelData = await this.backend.getChannel(channelId);
        if (!channelData) {
          throw new Error('Channel not found');
        }
        const channelStorage = new ChannelStoreEntry(channelData);

        const {participants} = channelStorage;
        const myAddress = participants[channelStorage.myIndex].signingAddress;
        const privateKey = await this.backend.getPrivateKey(myAddress);

        if (!privateKey) {
          throw new Error('No longer have private key');
        }
        const signedState = channelStorage.signAndAdd(
          _.pick(stateVars, 'outcome', 'turnNum', 'appData', 'isFinal'),
          privateKey
        );
        await this.backend.setChannel(channelId, channelStorage.data());
        this._eventEmitter.emit('channelUpdated', await this.getEntry(channelId));
        this._eventEmitter.emit('addToOutbox', {signedStates: [signedState]});
      }
    );

  async addObjective(objective: Objective, addToOutbox = true) {
    const objectives = this.objectives;
    if (!_.includes(objectives, objective)) {
      // TODO: Should setObjective take a key??
      this.objectives.push(objective);
      addToOutbox && this._eventEmitter.emit('addToOutbox', {objectives: [objective]});
      this._eventEmitter.emit('newObjective', objective);
    }
  }

  public addState = (state: SignedState) =>
    this.backend.transaction(
      'readwrite',
      [ObjectStores.channels, ObjectStores.nonces, ObjectStores.privateKeys],
      async () => {
        const channelId = calculateChannelId(state);
        const channelData =
          (await this.backend.getChannel(channelId)) ||
          (await this.initializeChannel(state)).data();
        const memoryChannelStorage = new ChannelStoreEntry(channelData);
        // TODO: This is kind of awkward
        state.signatures.forEach(sig => memoryChannelStorage.addState(state, sig));

        await this.backend.setChannel(channelId, memoryChannelStorage.data());
        this._eventEmitter.emit('channelUpdated', memoryChannelStorage);
        return memoryChannelStorage;
      }
    );

  public async getAddress(): Promise<string> {
    const privateKeys = await this.backend.privateKeys();
    return Object.keys(privateKeys)[0];
  }

  async pushMessage(message: Message) {
    const {signedStates, objectives} = message;
    if (signedStates) {
      // todo: check sig
      // todo: check the channel involves me
      await Promise.all(signedStates.map(signedState => this.addState(signedState)));
    }
    objectives?.map(o => this.addObjective(o, false));
  }

  public async getEntry(channelId: string): Promise<ChannelStoreEntry> {
    const data = await this.backend.getChannel(channelId);
    if (!data) {
      throw Error('Channel id not found');
    }

    return new ChannelStoreEntry(data);
  }

  public createBudget = (budget: SiteBudget) =>
    this.backend.transaction('readwrite', [ObjectStores.budgets], async tx => {
      const existingBudget = await this.backend.getBudget(budget.domain);
      if (existingBudget) {
        logger.error(Errors.budgetAlreadyExists);
        tx.abort();
      }

      await this.backend.setBudget(budget.domain, budget);
    });

  public clearBudget = site =>
    this.backend.transaction('readwrite', [ObjectStores.budgets], () =>
      this.backend.deleteBudget(site)
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
        const {applicationSite, supported, participants} = await this.getEntry(ledgerChannelId);
        const {outcome} = supported;
        if (typeof applicationSite !== 'string') throw new Error(Errors.noSiteForChannel);

        const currentBudget = await this.getBudget(applicationSite);

        const assetBudget = currentBudget?.forAsset[assetHolderAddress];

        if (!currentBudget || !assetBudget) throw new Error(Errors.noBudget);

        const channelBudget = assetBudget.channels[targetChannelId];
        if (!channelBudget) throw new Error(Errors.channelNotInBudget);
        const playerAddress = await this.getAddress();

        const playerDestination = participants.find(p => p.signingAddress === playerAddress)
          ?.destination;
        if (!playerDestination) {
          throw new Error(Errors.cannotFindDestination);
        }
        // Simply set the budget to the current ledger outcome
        assetBudget.availableSendCapacity = getAllocationAmount(outcome, playerDestination);
        assetBudget.availableReceiveCapacity = getAllocationAmount(outcome, HUB.destination);

        // Delete the funds assigned to the channel
        delete assetBudget.channels[targetChannelId];

        const result = await this.backend.setBudget(applicationSite, currentBudget);
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
        const site = entry.applicationSite;
        if (typeof site !== 'string') throw new Error(Errors.noSiteForChannel + ' ' + channelId);
        const currentBudget = await this.backend.getBudget(site);

        // TODO?: Create a new budget if one doesn't exist
        if (!currentBudget) throw new Error(Errors.noBudget + site);

        const assetBudget = currentBudget?.forAsset[assetHolderAddress];
        if (!assetBudget) throw new Error(Errors.noAssetBudget);

        if (
          assetBudget.availableSendCapacity.lt(amount.send) ||
          assetBudget.availableReceiveCapacity.lt(amount.receive)
        ) {
          throw new Error(Errors.budgetInsufficient);
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
  if (!amount) {
    throw new Error(`Cannot find allocation entry with destination ${destination}`);
  }
  return amount;
}
