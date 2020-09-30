import {
  Objective,
  ChannelStoredData,
  DomainBudget,
  StateVariables
} from '@statechannels/wallet-core';
import {filter, map} from 'rxjs/operators';

import {Store} from './store';
import {ChannelStoreEntry} from './channel-store-entry';

export {Store} from './store';

// TODO: Move to somewhere better?
export function supportedStateFeed(store: Store, channelId: string) {
  return store.channelUpdatedFeed(channelId).pipe(
    filter(e => !!e.supported),
    map(e => ({state: {...e.channelConstants, ...(e.supported as StateVariables)}}))
  );
}

export enum Errors {
  duplicateTurnNums = 'multiple states with same turn number',
  notSorted = 'states not sorted',
  multipleSignedStates = 'Store signed multiple states for a single turn',
  staleState = 'Attempting to sign a stale state',
  channelMissing = 'No channel found with id.',
  channelFunded = 'Channel already funded.',
  channelLocked = 'Channel is locked',
  noBudget = 'No budget exists for domain. ',
  noAssetBudget = "This domain's budget does contain this asset",
  channelNotInBudget = "This domain's budget does not reference this channel",
  noDomainForChannel = 'No domain defined for channel',
  domainExistsOnChannel = 'Channel already has a domain.',
  budgetAlreadyExists = 'There already exists a budget for this domain',
  budgetInsufficient = 'Budget insufficient to reserve funds',
  amountUnauthorized = 'Amount unauthorized in current budget',
  cannotFindDestination = 'Cannot find destination for participant',
  cannotFindPrivateKey = 'Private key missing for your address',
  notInChannel = 'Attempting to initialize  channel as a non-participant',
  noLedger = 'No ledger exists with peer',
  amountNotFound = 'Cannot find allocation entry with destination',
  invalidNonce = 'Invalid nonce',
  invalidTransition = 'Invalid transition',
  invalidAppData = 'Invalid app data',
  emittingDuringTransaction = 'Attempting to emit event during transaction',
  notMyTurn = "Cannot update channel unless it's your turn"
}

export interface DBBackend {
  initialize(cleanSlate: boolean, name: string): Promise<any>;

  // TODO: Perhaps the backend API should look more like this?
  // privateKeys(): Promise<Array<{signingAddress: string; privateKey: string}>>;
  privateKeys(): Promise<Record<string, string | undefined>>;
  ledgers(): Promise<Record<string, string | undefined>>;
  nonces(): Promise<Record<string, number | undefined>>;
  objectives(): Promise<Objective[]>;
  channels(): Promise<Record<string, ChannelStoreEntry | undefined>>;

  setDestinationAddress(destinationAddress: string): Promise<string>;
  getDestinationAddress(): Promise<string | undefined>;

  setPrivateKey(key: string, value: string): Promise<string>;
  getPrivateKey(key: string): Promise<string | undefined>;

  setChannel(key: string, value: ChannelStoredData): Promise<ChannelStoredData>;
  getChannel(key: string): Promise<ChannelStoreEntry | undefined>;

  getBudget(key: string): Promise<DomainBudget | undefined>;
  setBudget(key: string, budget: DomainBudget): Promise<DomainBudget>;
  deleteBudget(key: string): Promise<void>;

  setLedger(key: string, value: string): Promise<string>;
  getLedger(key: string): Promise<string | undefined>;

  setNonce(key: string, value: number): Promise<number>;
  getNonce(key: string): Promise<number | undefined>;

  setObjective(key: number, value: Objective): Promise<Objective>;
  getObjective(key: number): Promise<Objective | undefined>;

  /**
   * Starts an async database transaction.
   *
   * When mode is 'readwrite', acquires a lock on each store listed in stores param.
   *
   * dexie backend rejects with 'NotFoundError: TableX not part of transaction', if cb
   * attempts to use table not listed by stores param.
   *
   * Rejects if tx.abort() is called.
   *
   * @param mode
   * @param stores array of ObjectStore names usd in cb
   * @param cb callback to execute within transaction scope
   * @returns promise resolving to return value of cb
   */
  transaction<T, S extends ObjectStores>(
    mode: TXMode,
    stores: S[],
    cb: (tx: Transaction) => Promise<T>
  ): Promise<T>;
  transactionOngoing: boolean;
}

export type Transaction = {
  abort(): void;
  // TODO: We could expose a store function on the transaction and
  // potentially do away with the individual getters on the backend interface
  // EG:
  // store<S extends Stores>(s: S): ObjectStore<S>;
  // Or, we could just expose direct properties, like
  // channels(): Table<ChannelRecord>
};

export type TXMode = 'readonly' | 'readwrite';

export const enum ObjectStores {
  channels = 'channels',
  objectives = 'objectives',
  nonces = 'nonces',
  privateKeys = 'privateKeys',
  destinationAddress = 'destinationAddress',
  ledgers = 'ledgers',
  budgets = 'budgets'
}

declare global {
  interface Window {
    ethereum: any;
  }
}
