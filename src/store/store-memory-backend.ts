import {BigNumber} from 'ethers/utils';
import {MemoryChannelStoreEntry} from './memory-channel-storage';
import {Objective, DBBackend} from './types';

export class MemoryBackend implements DBBackend {
  private _channels: Record<string, MemoryChannelStoreEntry | undefined> = {};
  private _objectives: Objective[] = [];
  private _nonces: Record<string, BigNumber | undefined> = {};
  private _privateKeys: Record<string, string | undefined> = {};
  private _ledgers: Record<string, string | undefined> = {};

  // Generic Getters

  public async privateKeys() {
    return Promise.resolve(this._privateKeys);
  }
  public async ledgers() {
    return Promise.resolve(this._ledgers);
  }
  public async nonces() {
    return Promise.resolve(this._nonces);
  }
  public async objectives() {
    return Promise.resolve(this._objectives);
  }
  public async channels() {
    return Promise.resolve(this._channels);
  }

  // Individual Getters/seters

  public async setPrivateKey(key: string, value: string) {
    this._privateKeys[key] = value;
    return value;
  }

  public async getPrivateKey(key: string) {
    return this._privateKeys[key];
  }

  public async setChannel(key: string, value: MemoryChannelStoreEntry) {
    this._channels[key] = value;
    return value;
  }

  public async getChannel(key: string) {
    return this._channels[key];
  }

  public async setLedger(key: string, value: string) {
    this._ledgers[key] = value;
    return value;
  }

  public async getLedger(key: string) {
    return this._ledgers[key];
  }

  public async setNonce(key: string, value: BigNumber) {
    this._nonces[key] = value;
    return value;
  }

  public async getNonce(key: string) {
    return this._nonces[key];
  }

  public async setObjective(key: string, value: string) {
    this._objectives[key] = value;
    return value;
  }

  public async setObjectives(values: Objective[]) {
    this._objectives = values;
    return values;
  }

  public async getObjective(key: string) {
    return this._objectives[key];
  }
}
