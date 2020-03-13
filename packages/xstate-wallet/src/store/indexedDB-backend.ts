import {BigNumber} from 'ethers/utils';
import {MemoryChannelStoreEntry} from './memory-channel-storage';
import {Objective, DBBackend} from './types';
import 'fake-indexeddb/auto';

export enum ObjectStores {
  channels = 'channels',
  objectives = 'objectives',
  nonces = 'nonces',
  privateKeys = 'privateKeys',
  ledgers = 'ledgers'
}

// A running, functioning example can be seen and played with here: https://codesandbox.io/s/elastic-kare-m1jp8
export class IndexedDBBackend implements DBBackend {
  private _db: IDBDatabase;

  constructor() {
    if (!indexedDB) {
      console.error("Your browser doesn't support a stable version of IndexedDB.");
    }
  }
  public async initialize() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('xstateWallet', 1);

      request.onupgradeneeded = event => {
        const db = (event.target as any).result;
        db.createObjectStore('channels', {autoIncrement: true});
        db.createObjectStore('objectives', {autoIncrement: true});
        db.createObjectStore('nonces', {autoIncrement: true});
        db.createObjectStore('privateKeys', {autoIncrement: true});
        db.createObjectStore('ledgers', {autoIncrement: true});
      };

      request.onerror = err => reject(err);
      request.onsuccess = () => {
        this._db = request.result;
        resolve(request.result);
      };
    });
  }

  // Generic Getters

  public async channels() {
    return this.getAll(ObjectStores.channels);
  }
  public async objectives() {
    return this.getAll(ObjectStores.objectives);
  }
  public async nonces() {
    return this.getAll(ObjectStores.nonces);
  }
  public async privateKeys() {
    return this.getAll(ObjectStores.nonces);
  }
  public async ledgers() {
    return this.getAll(ObjectStores.ledgers);
  }

  // Individual Getters

  public async getChannel(key: string) {
    return this.get(ObjectStores.channels, key);
  }
  public async getObjective(key: number) {
    return this.get(ObjectStores.objectives, key);
  }
  public async getNonce(key: string) {
    return this.get(ObjectStores.nonces, key);
  }
  public async getPrivateKey(key: string) {
    return this.get(ObjectStores.privateKeys, key);
  }
  public async getLedger(key: string) {
    return this.get(ObjectStores.ledgers, key);
  }

  // Individual Getters

  public async setPrivateKey(key: string, value: string) {
    return this.put(ObjectStores.privateKeys, value, key);
  }
  public async setChannel(key: string, value: MemoryChannelStoreEntry) {
    return this.put(ObjectStores.channels, value, key);
  }
  public async setLedger(key: string, value: string) {
    return this.put(ObjectStores.ledgers, value, key);
  }
  public async setNonce(key: string, value: BigNumber) {
    return this.put(ObjectStores.nonces, value, key);
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
      if (!_objectives.includes(objective)) {
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
    return new Promise((resolve, reject) => {
      const request = this._db
        .transaction([storeName], 'readwrite')
        .objectStore(storeName)
        .openCursor();
      request.onerror = err => {
        this.logError(err, 'getAll ' + storeName);
        reject(err);
      };
      const results = {};
      request.onsuccess = event => {
        const cursor = event.target && (event.target as any).result;
        if (cursor) {
          results[cursor.primaryKey] = cursor.value;
          cursor.continue();
        } else {
          resolve(asArray ? Object.values(results) : results);
        }
      };
    });
  }

  /**
   * Gets an element from a object store
   * @param storeName
   * @param key required
   */
  private async get(storeName: ObjectStores, key: string | number): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = this._db
        .transaction([storeName], 'readonly')
        .objectStore(storeName)
        .get(key);
      request.onerror = err => {
        this.logError(err, 'get ' + storeName);
        reject(err);
      };
      request.onsuccess = _ => resolve(request.result);
    });
  }

  /**
   * Adds or replaces an element in a object store
   * @param storeName
   * @param value
   * @param key
   */
  private async put(storeName: ObjectStores, value: any, key: string | number): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([storeName], 'readwrite');
      transaction.objectStore(storeName).put(value, key);
      transaction.onerror = err => {
        this.logError(err, 'put ' + storeName);
        reject(err);
      };
      transaction.oncomplete = _ => {
        resolve(value);
      };
    });
  }

  /**
   * Replace an array with another
   * @param storeName
   * @param values
   */
  private async setArray(storeName: ObjectStores, values: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      store.clear();
      values.forEach((value, index) => store.put(value, index));
      transaction.onerror = err => {
        this.logError(err, 'setArray ' + storeName);
        reject(err);
      };
      transaction.oncomplete = _ => resolve(values);
    });
  }

  /**
   * Deletes an element.
   * Not used, but added to have a complete CRUD, just in case.
   * @param storeName
   * @param key
   * @returns true on success, false on fail.
   */
  private async delete(storeName: ObjectStores, key: string | number): Promise<any> {
    return new Promise((resolve, reject) => {
      const store = this._db.transaction([storeName], 'readwrite').objectStore(storeName);
      const request = store.openCursor(key);
      request.onerror = err => {
        this.logError(err, 'delete (not found)' + storeName);
        reject(err);
      };
      request.onsuccess = event => {
        const cursor = event.target && (event.target as any).result;
        const record = cursor && cursor.value;
        console.log(typeof record, typeof cursor);
        if (!cursor) {
          console.error(`Record of ${storeName} with key: ${key} not found`);
          resolve(false);
        } else {
          const reqDelete = store.delete(key);
          reqDelete.onsuccess = _ => resolve(true);
          reqDelete.onerror = err => {
            this.logError(err, 'delete ' + storeName);
            reject(err);
          };
        }
      };
    });
  }

  /**
   * Formats and parses errors thrown
   * @param error
   * @param context function/situation of the error
   */
  private logError(error, context: string): void {
    console.error(
      `Error - IndexedDB${context ? ' - ' + context : ''}`,
      JSON.stringify(error, ['message', 'arguments', 'type', 'name', 'target'])
    );
  }
}
