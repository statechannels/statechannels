import {Observable, fromEvent, merge, from} from 'rxjs';
import {BigNumber, bigNumberify} from 'ethers/utils';
import {
  BudgetItem,
  DBBackend,
  Message,
  Objective,
  Participant,
  SignedState,
  SiteBudget,
  State,
  StateVariables,
  ToRelease
} from './types';

import {filter, map, concatAll} from 'rxjs/operators';
import {EventEmitter} from 'eventemitter3';
import * as _ from 'lodash';

import {Wallet} from 'ethers';

import {MemoryChannelStoreEntry} from './memory-channel-storage';
import {AddressZero} from 'ethers/constants';
import {Chain, FakeChain} from '../chain';
import {calculateChannelId, hashState} from './state-utils';
import {NETWORK_ID} from '../constants';

import {Guid} from 'guid-typescript';
import {MemoryBackend} from './memory-backend';
import {ChannelStoreEntry} from './channel-store-entry';
import {Errors} from '.';
import AsyncLock from 'async-lock';

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
  objectiveFeed: Observable<Objective>;
  outboxFeed: Observable<Message>;
  pushMessage: (message: Message) => Promise<void>;
  channelUpdatedFeed(channelId: string): Observable<ChannelStoreEntry>;
  getAddress(): Promise<string>;
  signAndAddState(channelId: string, stateVars: StateVariables): Promise<void>;
  createChannel(
    participants: Participant[],
    challengeDuration: BigNumber,
    stateVars: StateVariables,
    appDefinition?: string
  ): Promise<ChannelStoreEntry>;
  getEntry(channelId): Promise<ChannelStoreEntry>;

  lockFeed: Observable<ChannelLock>;
  acquireChannelLock(channelId: string): Promise<ChannelLock>;
  releaseChannelLock(lock: ChannelLock): Promise<void>;

  setLedger(ledgerId: string): Promise<void>;
  getLedger(peerId: string): Promise<ChannelStoreEntry>;

  setFunding(channelId: string, funding: Funding): Promise<void>;
  addObjective(objective: Objective): void;
  getBudget: (site: string) => Promise<SiteBudget>;
  createBudget: (budget: SiteBudget) => Promise<void>;
  reserveFunds(site: string, assetHolderAddress: string, amount: BudgetItem): Promise<SiteBudget>;
  releaseFunds(site: string, toRelease: ToRelease[]): Promise<SiteBudget>;

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

  constructor(chain?: Chain, backend?: DBBackend) {
    // TODO: We shouldn't default to a fake chain
    // but I didn't feel like updating all the constructor calls
    this.chain = chain || new FakeChain();
    this.chain.initialize();
    if (backend) {
      this.backend = backend as DBBackend;
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
    } else {
      // generate a new key
      const wallet = Wallet.createRandom();
      await this.backend.setPrivateKey(wallet.address, wallet.privateKey);
    }
  }

  public async getBudget(site: string): Promise<SiteBudget> {
    const budget = await this.backend.getBudget(site);
    if (!budget) throw new Error(`No budget for ${site}`);
    return budget;
  }
  public async updateOrCreateBudget(budget: SiteBudget): Promise<void> {
    await this.backend.setBudget(budget.site, budget);
  }

  public channelUpdatedFeed(channelId: string): Observable<ChannelStoreEntry> {
    // TODO: The following line is not actually type safe.
    // fromEvent<'foo'>(this._eventEmitter, 'channelUpdated') would happily return
    // Observable<'foo'>
    const newEntries = fromEvent<ChannelStoreEntry>(this._eventEmitter, 'channelUpdated').pipe(
      filter(cs => cs.channelId === channelId)
    );

    const currentEntry = from(this.backend.getChannel(channelId)).pipe(
      filter<MemoryChannelStoreEntry>(c => !!c)
    );

    return merge(currentEntry, newEntries);
  }

  get objectiveFeed(): Observable<Objective> {
    const newObjectives = fromEvent<Objective>(this._eventEmitter, 'newObjective');
    const currentObjectives = from(this.backend.objectives()).pipe(concatAll());

    return merge(newObjectives, currentObjectives);
  }

  get outboxFeed(): Observable<Message> {
    return fromEvent(this._eventEmitter, 'addToOutbox');
  }

  private async initializeChannel(state: State): Promise<MemoryChannelStoreEntry> {
    const addresses = state.participants.map(x => x.signingAddress);
    const privateKeys = await this.backend.privateKeys();
    const myIndex = addresses.findIndex(address => {
      return !!privateKeys[address];
    });
    if (myIndex === -1) {
      throw new Error("Couldn't find the signing key for any participant in wallet.");
    }

    const channelId = calculateChannelId(state);

    // TODO: There could be concurrency problems which lead to entries potentially being overwritten.
    await this.setNonce(addresses, state.channelNonce);
    const key = hashState(state);

    return this.backend.setChannel(
      channelId,
      new MemoryChannelStoreEntry(state, myIndex, {[key]: state})
    );
  }

  public async setFunding(channelId: string, funding: Funding): Promise<void> {
    const channelEntry = await this.backend.getChannel(channelId);
    if (!channelEntry) {
      throw new Error(`No channel for ${channelId}`);
    }
    if (channelEntry.funding) {
      throw `Channel ${channelId} already funded`;
    }
    channelEntry.setFunding(funding);
    await this.backend.setChannel(channelEntry.channelId, channelEntry);
  }

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

  public async setLedger(ledgerId: string) {
    const entry = await this.backend.getChannel(ledgerId);
    if (!entry) {
      throw new Error(`No channel found with channel id ${ledgerId}`);
    }
    // This is not on the Store interface itself -- it is useful to set up a test store
    await this.backend.setChannel(entry.channelId, entry);
    const address = await this.getAddress();
    const peerId = entry.participants.find(p => p.signingAddress !== address);
    if (peerId) await this.backend.setLedger(peerId.participantId, entry.channelId);
    else throw 'No peer';
  }

  public async createChannel(
    participants: Participant[],
    challengeDuration: BigNumber,
    stateVars: StateVariables,
    appDefinition = AddressZero
  ): Promise<ChannelStoreEntry> {
    const addresses = participants.map(x => x.signingAddress);
    const privateKeys = await this.backend.privateKeys();
    const myIndex = addresses.findIndex(address => !!privateKeys[address]);
    if (myIndex === -1) {
      throw new Error("Couldn't find the signing key for any participant in wallet.");
    }

    const channelNonce = (await this.getNonce(addresses)).add(1);
    const chainId = NETWORK_ID;

    const entry = await this.initializeChannel({
      chainId,
      challengeDuration,
      channelNonce,
      participants,
      appDefinition,
      ...stateVars
    });
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

  async signAndAddState(channelId: string, stateVars: StateVariables) {
    const channelStorage = await this.backend.getChannel(channelId);

    if (!channelStorage) {
      throw new Error('Channel not found');
    }
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
    await this.backend.setChannel(channelId, channelStorage);
    this._eventEmitter.emit('channelUpdated', await this.getEntry(channelId));
    this._eventEmitter.emit('addToOutbox', {signedStates: [signedState]});
  }

  async addObjective(objective: Objective) {
    const objectives = await this.backend.objectives();
    if (!_.includes(objectives, objective)) {
      // TODO: Should setObjective take a key??
      this.backend.setObjective(objectives.length, objective);
      this._eventEmitter.emit('addToOutbox', {objectives: [objective]});
      this._eventEmitter.emit('newObjective', objective);
    }
  }

  async addState(state: SignedState): Promise<ChannelStoreEntry> {
    const channelId = calculateChannelId(state);
    const channelStorage =
      (await this.backend.getChannel(channelId)) || (await this.initializeChannel(state));
    // TODO: This is kind of awkward
    state.signatures.forEach(sig => channelStorage.addState(state, sig));

    const entry = await this.backend.setChannel(channelId, channelStorage);
    this._eventEmitter.emit('channelUpdated', entry);
    return entry;
  }

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
    if (objectives && objectives.length) {
      (await this.backend.setReplaceObjectives(objectives)).forEach(objective =>
        this._eventEmitter.emit('newObjective', objective)
      );
    }
  }

  public async getEntry(channelId: string): Promise<ChannelStoreEntry> {
    const entry = await this.backend.getChannel(channelId);
    if (!entry) {
      throw 'Channel id not found';
    }

    return entry;
  }

  private budgetLock = new AsyncLock();
  public async createBudget() {
    // NOOP
  }
  public async releaseFunds(site, budget) {
    return budget;
  }
  public async reserveFunds(
    site: string,
    assetHolderAddress: string,
    amount: BudgetItem
  ): Promise<SiteBudget> {
    return await this.budgetLock
      .acquire<SiteBudget>(site, async release => {
        const currentBudget = await this.getBudget(site);

        const ethBudget = currentBudget?.forAsset[assetHolderAddress];
        if (!ethBudget) {
          throw new Error(Errors.noBudget);
        }

        const {free, inUse} = ethBudget;

        if (free.hubAmount.lt(amount.hubAmount) || free.playerAmount.lt(amount.playerAmount)) {
          throw new Error(Errors.budgetInsufficient);
        }

        currentBudget.forAsset[assetHolderAddress] = {
          ...ethBudget,
          free: {
            hubAmount: free.hubAmount.sub(amount.hubAmount),
            playerAmount: free.playerAmount.sub(amount.playerAmount)
          },
          inUse: {
            hubAmount: inUse.hubAmount.add(amount.hubAmount),
            playerAmount: inUse.playerAmount.add(amount.playerAmount)
          }
        };

        release();

        return currentBudget;
      })
      .catch(e => {
        console.error(e);
        throw e;
      });
  }
}

export function supportedStateFeed(store: Store, channelId: string) {
  return store.channelUpdatedFeed(channelId).pipe(
    filter(e => e.isSupported),
    map(({supported}) => ({state: supported}))
  );
}
