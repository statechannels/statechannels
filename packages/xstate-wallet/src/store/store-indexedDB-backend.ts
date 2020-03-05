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
        .getAll(); // TODO: fix: not returning with keys
      request.onerror = err => reject(err);
      request.onsuccess = event => resolve(event.target.result);
    });
  }

  private async get(collection: string, key: string) {
    return new Promise<any>((resolve, reject) => {
      const request = this._db
        .transaction([collection], 'readonly')
        .objectStore(collection)
        .get(key);
      request.onerror = err => reject(err);
      request.onsuccess = _ => resolve(request.result);
    });
  }

  private async add(collection, key, value) {
    return new Promise<any>((resolve, reject) => {
      const request = this._db
        .transaction([collection], 'readwrite')
        .objectStore(collection)
        .add(value, key);
      request.onerror = err => reject(err);
      request.onsuccess = _ => resolve(value);
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

  // Individual Getters

  public async getChannel(key: string) {
    return this.get('channels', key);
  }
  public async getObjective(key: string) {
    return this.get('objectives', key);
  }
  public async getNonce(key: string) {
    return this.get('nonces', key);
  }
  public async getPrivateKey(key: string) {
    return this.get('privateKeys', key);
  }
  public async getLedger(key: string) {
    return this.get('ledgers', key);
  }

  // Individual Getters

  public async setPrivateKey(key: string, value: string) {
    return this.add('privateKeys', key, value);
  }
  public async setChannel(key: string, value: MemoryChannelStoreEntry) {
    return this.add('channels', key, value);
  }
  public async setLedger(key: string, value: string) {
    return this.add('ledgers', key, value);
  }
  public async setNonce(key: string, value: BigNumber) {
    return this.add('nonces', key, value);
  }
  public async setObjective(key: string, value: string) {
    return this.add('objectives', key, value);
  }
  public async setObjectives(values: Objective[]) {
    // TODO: make a indexedDB objectCollection full replacer.
    return values;
  }
}
