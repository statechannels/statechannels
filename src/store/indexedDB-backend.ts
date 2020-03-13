import {BigNumber} from 'ethers/utils';
import {MemoryChannelStoreEntry} from './memory-channel-storage';
import {Objective, DBBackend} from './types';
import 'fake-indexeddb/auto';

enum ObjectStores {
  channels = 'channels',
  objectives = 'objectives',
  nonces = 'nonces',
  privateKeys = 'privateKeys',
  ledgers = 'ledgers'
}

// A running, functioning example can be seen and played with here: https://codesandbox.io/s/elastic-kare-m1jp8
export class IndexedDBBackend implements DBBackend {
  private _db: any;

  constructor() {
    if (!indexedDB) {
      console.error("Your browser doesn't support a stable version of IndexedDB.");
    }
  }
  public async initialize(cleanSlate = false) {
    if (cleanSlate) {
      await this.reset();
    }
    return this.create();
  }

  private async create() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('xstateWallet', 1);

      request.onupgradeneeded = event => {
        const db = (event.target as any).result;
        db.createObjectStore('channels', {unique: true});
        db.createObjectStore('objectives', {unique: true});
        db.createObjectStore('nonces', {unique: true});
        db.createObjectStore('privateKeys', {unique: true});
        db.createObjectStore('ledgers', {unique: true});
      };

      request.onerror = err => reject(err);
      request.onsuccess = () => {
        this._db = request.result;
        resolve(request.result);
      };
    });
  }

  private async reset() {
    return new Promise((resolve, reject) => {
      const reqDeletion = indexedDB.deleteDatabase('xstateWallet');
      reqDeletion.onerror = err => reject(err);
      reqDeletion.onsuccess = () => {
        console.log('DB reseted');
        resolve();
      };
    });
  }

  // Generic Getters

  public async channels() {
    const channels = await this.getAll(ObjectStores.channels);
    for (const key in channels) {
      channels[key] = MemoryChannelStoreEntry.fromJson(channels[key]);
    }
    return channels;
  }
  public async objectives() {
    return this.getAll(ObjectStores.objectives);
  }
  public async nonces() {
    const nonces = await this.getAll(ObjectStores.nonces);
    for (const key in nonces) {
      nonces[key] = new BigNumber(nonces[key]);
    }
    return nonces;
  }
  public async privateKeys() {
    return this.getAll(ObjectStores.nonces);
  }
  public async ledgers() {
    return this.getAll(ObjectStores.ledgers);
  }

  // Individual Getters

  public async getChannel(key: string) {
    return MemoryChannelStoreEntry.fromJson(await this.get(ObjectStores.channels, key));
  }
  public async getObjective(key: number) {
    return this.get(ObjectStores.objectives, key);
  }
  public async getNonce(key: string) {
    const nonce = await this.get(ObjectStores.nonces, key);
    return new BigNumber(nonce);
  }
  public async getPrivateKey(key: string) {
    return this.get(ObjectStores.privateKeys, key);
  }
  public async getLedger(key: string) {
    return this.get(ObjectStores.ledgers, key);
  }

  // Individual Setters

  public async setPrivateKey(key: string, value: string) {
    return this.put(ObjectStores.privateKeys, value, key);
  }
  public async setChannel(key: string, value: MemoryChannelStoreEntry) {
    return this.put(ObjectStores.channels, value.data(), key);
  }
  public async addChannel(key: string, value: MemoryChannelStoreEntry) {
    return this.add(ObjectStores.channels, value.data(), key, true);
  }
  public async setLedger(key: string, value: string) {
    return this.put(ObjectStores.ledgers, value, key);
  }
  public async setNonce(key: string, value: BigNumber) {
    return this.put(ObjectStores.nonces, value.toString(), key);
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
      request.onerror = _ => {
        this.logError(request.error, 'getAll ' + storeName);
        reject(request.error);
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
      request.onerror = _ => {
        this.logError(request.error, 'get ' + storeName);
        reject(request.error);
      };
      request.onsuccess = _ => resolve(request.result);
    });
  }

  /**
   * Adds an element in a object store
   * @param storeName
   * @param value
   * @param key
   * @param silentOverwriteError silences the "Key already exists in the object store." Error
   */
  private async add(
    storeName: ObjectStores,
    value: any,
    key: string | number,
    silentOverwriteError: boolean
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([storeName], 'readwrite');
      const request = transaction.objectStore(storeName).add(value, key);
      transaction.onerror = _ => {
        if (silentOverwriteError) {
          resolve(value);
        } else {
          this.logError(request.error, 'add ' + storeName);
          reject(request.error);
        }
      };
      transaction.oncomplete = _ => {
        resolve(value);
      };
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
      const request = transaction.objectStore(storeName).put(value, key);
      transaction.onerror = _ => {
        this.logError(request.error, 'put ' + storeName);
        reject(request.error);
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
      transaction.onerror = _ => {
        this.logError(transaction.error, 'setArray ' + storeName);
        reject(transaction.error);
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
  // private async delete(storeName: ObjectStores, key: string | number): Promise<any> {
  //   return new Promise((resolve, reject) => {
  //     const store = this._db.transaction([storeName], 'readwrite').objectStore(storeName);
  //     const request = store.openCursor(key);
  //     request.onerror = _ => {
  //       this.logError(request.error, 'delete (not found)' + storeName);
  //       reject(request.error);
  //     };
  //     request.onsuccess = event => {
  //       const cursor = event.target && (event.target as any).result;
  //       const record = cursor && cursor.value;
  //       console.log(typeof record, typeof cursor);
  //       if (!cursor) {
  //         console.error(`Record of ${storeName} with key: ${key} not found`);
  //         resolve(false);
  //       } else {
  //         const reqDelete = store.delete(key);
  //         reqDelete.onsuccess = _ => resolve(true);
  //         reqDelete.onerror = _ => {
  //           this.logError(reqDelete.error, 'delete ' + storeName);
  //           reject(reqDelete.error);
  //         };
  //       }
  //     };
  //   });
  // }

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
