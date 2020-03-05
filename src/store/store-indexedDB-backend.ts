import {BigNumber} from 'ethers/utils';
import {MemoryChannelStoreEntry} from './memory-channel-storage';
import {Objective, DBBackend} from './types';
import 'fake-indexeddb/auto';

export class MemoryBackend implements DBBackend {
  // I leave this for reference of types
  // private _channels: Record<string, MemoryChannelStoreEntry | undefined> = {};
  // private _objectives: Objective[] = [];
  // private _nonces: Record<string, BigNumber | undefined> = {};
  // private _privateKeys: Record<string, string | undefined> = {};
  // private _ledgers: Record<string, string | undefined> = {};

  private _db;

  constructor(params) {
    if (!indexedDB) {
      console.error("Your browser doesn't support a stable version of IndexedDB.");
    }
    const request = indexedDB.open('xstateWallet', 1);
    request.onerror = event => console.error('error: ', event);

    request.onupgradeneeded = event => {
      const db = (event.target as any).result;
      db.createObjectStore('channels');
      db.createObjectStore('objectives', {autoIncrement: true});
      db.createObjectStore('nonces');
      db.createObjectStore('privateKeys');
      db.createObjectStore('ledgers');
    };

    request.onsuccess = event => {
      this._db = request.result;
      console.log('DB Loaded: ' + this._db);
    };
  }

  private async getAll(collection: string) {
    return new Promise<any>((resolve, reject) => {
      const request = this._db
        .transaction([collection], 'readonly')
        .objectStore(collection)
        .openCursor();
      let result = {};
      request.onerror = err => reject(err);
      request.onsuccess = event => {
        const cursor = (event.target as any).result;
        if (cursor) {
          result = {...result, [cursor.key]: cursor.value};
          cursor.continue();
        } else {
          resolve(result);
        }
      };
    });
  }

  // Generic Getters
  public async channels() {
    return this.getAll('channels');
  }
  public async objectives() {
    return this.getAll('objectives');
  }
  public async nonces() {
    return this.getAll('nonces');
  }
  public async privateKeys() {
    return this.getAll('privateKeys');
  }
  public async ledgers() {
    return this.getAll('ledgers');
  }

  // Individual Getters/seters

  public async setPrivateKey(key: string, value: string) {
    return value;
  }

  public async getPrivateKey(key: string) {
    return undefined;
  }

  public async setChannel(key: string, value: MemoryChannelStoreEntry) {
    return value;
  }

  public async getChannel(key: string) {
    return undefined;
  }

  public async setLedger(key: string, value: string) {
    return value;
  }

  public async getLedger(key: string) {
    return undefined;
  }

  public async setNonce(key: string, value: BigNumber) {
    return value;
  }

  public async getNonce(key: string) {
    return undefined;
  }

  public async setObjective(key: string, value: string) {
    return value;
  }

  public async setObjectives(values: Objective[]) {
    return values;
  }

  public async getObjective(key: string) {
    return undefined;
  }
}
