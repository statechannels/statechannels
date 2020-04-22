import {BigNumber, bigNumberify} from 'ethers/utils';
import {ChannelStoreEntry} from './channel-store-entry';
import {Objective, DBBackend, SiteBudget, ChannelStoredData, AssetBudget} from './types';
import * as _ from 'lodash';

// FIXME: Perhaps this should be required by jest before running tests?
// Or, accept explicit references to the fake indexedDB
// https://github.com/dumbmatter/fakeIndexedDB#with-dexie-and-other-indexeddb-api-wrappers
if (process.env.NODE_ENV === 'test') require('fake-indexeddb/auto');
import Dexie from 'dexie';

enum ObjectStores {
  channels = 'channels',
  objectives = 'objectives',
  nonces = 'nonces',
  privateKeys = 'privateKeys',
  ledgers = 'ledgers',
  budgets = 'budgets'
}

// A running, functioning example can be seen and played with here: https://codesandbox.io/s/elastic-kare-m1jp8
export class Backend implements DBBackend {
  private _db: Dexie;

  constructor() {
    if (!indexedDB) {
      console.error("Your browser doesn't support a stable version of IndexedDB.");
    }
  }
  /**
   * Initializes the Database and it's structure.
   * @param cleanSlate if true, it clears all the object stores of data
   * @param databaseName (optional) useful maybe for multiple tenants in the same page?
   */
  public async initialize(cleanSlate = false, databaseName = 'xstateWallet') {
    const createdDB = await this.create(databaseName);
    if (cleanSlate) {
      await Promise.all([
        this.clear(ObjectStores.channels),
        this.clear(ObjectStores.objectives),
        this.clear(ObjectStores.nonces),
        this.clear(ObjectStores.privateKeys),
        this.clear(ObjectStores.ledgers),
        this.clear(ObjectStores.budgets)
      ]);
    }
    return createdDB;
  }

  private async create(databaseName: string) {
    this._db = new Dexie(databaseName);
    this._db.version(1).stores({
      [ObjectStores.channels]: '',
      [ObjectStores.nonces]: '',
      [ObjectStores.privateKeys]: '',
      [ObjectStores.ledgers]: '',
      [ObjectStores.budgets]: ''
    });

    return this._db.open();
  }

  public async clear(storeName: ObjectStores): Promise<string> {
    return this._db[storeName]?.clear();
  }

  // Generic Getters

  public async channels() {
    return this.getAll(ObjectStores.channels);
  }

  public async objectives() {
    return this.getAll(ObjectStores.objectives, true);
  }
  public async nonces() {
    const nonces = await this.getAll(ObjectStores.nonces);
    for (const key in nonces) {
      if (nonces[key]) {
        nonces[key] = new BigNumber(-1);
      } else {
        nonces[key] = new BigNumber(nonces[key]);
      }
    }
    return nonces;
  }

  public async privateKeys() {
    return this.getAll(ObjectStores.privateKeys);
  }

  public async ledgers() {
    return this.getAll(ObjectStores.ledgers);
  }

  // Individual Getters
  public async getBudget(key: string): Promise<SiteBudget | undefined> {
    const budget: SiteBudget | undefined = await this.get(ObjectStores.budgets, key);
    if (!budget) return budget;

    return {
      ...budget,
      forAsset: _.mapValues(budget.forAsset, (assetBudget: AssetBudget) => ({
        assetHolderAddress: assetBudget.assetHolderAddress,
        availableReceiveCapacity: bigNumberify(assetBudget.availableReceiveCapacity),
        availableSendCapacity: bigNumberify(assetBudget.availableSendCapacity),
        channels: assetBudget.channels
      }))
    };
  }

  public async setBudget(key: string, value: SiteBudget) {
    return this.put(ObjectStores.budgets, value, key);
  }

  public async deleteBudget(key: string) {
    return this.delete(ObjectStores.budgets, key);
  }
  public async getChannel(key: string) {
    // FIXME: This is typed to return ChannelStoredData, but it actually
    // returns ChannelStoreEntry.
    // This happens all over the place.
    const channel = await this.get(ObjectStores.channels, key);
    return channel && ChannelStoreEntry.fromJson(channel);
  }
  public async getObjective(key: number) {
    return this.get(ObjectStores.objectives, key);
  }
  public async getNonce(key: string) {
    const nonce = await this.get(ObjectStores.nonces, key);
    if (!nonce) {
      return new BigNumber(-1);
    }
    return new BigNumber(nonce);
  }
  public async getPrivateKey(key: string) {
    return this.get(ObjectStores.privateKeys, key);
  }
  public async getLedger(key: string) {
    return this.get(ObjectStores.ledgers, key);
  }

  // Individual Setters

  public async setPrivateKey(signingAddress: string, privateKey: string) {
    const pksPutted = await this.put(ObjectStores.privateKeys, privateKey, signingAddress);
    return pksPutted;
  }
  public async setChannel(key: string, value: ChannelStoredData) {
    return this.put(ObjectStores.channels, value, key);
  }
  public async setLedger(key: string, value: string) {
    return this.put(ObjectStores.ledgers, value, key);
  }
  public async setNonce(key: string, value: BigNumber) {
    await this.put(ObjectStores.nonces, value.toString(), key);

    return await this._db[ObjectStores.nonces].get(key);
  }
  public async setObjective(key: number, value: Objective) {
    return this.put(ObjectStores.objectives, value, Number(key)) as Promise<Objective>;
  }

  /**
   * Updates the objectives object store with new objectives.
   * @param values objetives that may or may not be already in the object store.
   * @returns the added objectives, if any
   */
  public async setReplaceObjectives(values: Objective[]) {
    const _objectives: Objective[] = await this.getAll(ObjectStores.objectives, true);
    const newObjectives: Objective[] = [];
    values.forEach(objective => {
      if (!_objectives.some(saved => _.isEqual(objective, saved))) {
        _objectives.push(objective);
        newObjectives.push(objective);
      }
    });
    await this.setArray(ObjectStores.objectives, _objectives);
    return newObjectives;
  }

  // Private Internal Methods

  /**
   * Gets all elements of a object store.
   * @param storeName
   * @param asArray if true, the result object, is transformed to an array
   */
  private async getAll(storeName: ObjectStores, asArray?: boolean): Promise<any> {
    return _.mapValues(_.keyBy(await this._db[storeName].toArray(), 'key'), 'value');
  }

  /**
   * Gets an element from a object store
   * @param storeName
   * @param key required
   */
  private async get(storeName: ObjectStores, key: string | number): Promise<any> {
    return (await this._db[storeName].get(key))?.value;
  }

  /**
   * Adds or replaces an element in a object store
   * @param storeName
   * @param value
   * @param key
   */
  private async put(storeName: ObjectStores, value: any, key: string | number): Promise<any> {
    await this._db[storeName].put({key, value}, key);

    return this._db[storeName].get(key);
  }

  /**
   * Replace an array with another
   * @param storeName
   * @param values
   */
  private async setArray(storeName: ObjectStores, values: any[]): Promise<any[]> {
    return this._db.transaction('rw', this._db[storeName], () =>
      // FIXME
      []
    );
  }

  /**
   * Deletes an element.
   * Not used, but added to have a complete CRUD, just in case.
   * @param storeName
   * @param key
   * @returns true on success, false on fail.
   */
  private async delete(storeName: ObjectStores, key: string | number): Promise<any> {
    return this._db.transaction('rw', this._db[storeName], () => {
      // FIXME
    });
  }
}
