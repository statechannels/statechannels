import {BigNumber} from 'ethers/utils';
import {ChannelStoredData, MemoryChannelStoreEntry} from './memory-channel-storage';
import {Objective, DBBackend} from './types';

export class MemoryBackend implements DBBackend {
  private _channels: Record<string, ChannelStoredData | undefined> = {};
  private _objectives: Objective[] = [];
  private _nonces: Record<string, string | undefined> = {};
  private _privateKeys: Record<string, string | undefined> = {};
  private _ledgers: Record<string, string | undefined> = {};

  public async initialize(cleanSlate = false) {
    if (cleanSlate) {
      this._channels = {};
      this._objectives = [];
      this._nonces = {};
      this._privateKeys = {};
      this._ledgers = {};
    }
  }
  // Generic Getters

  public async privateKeys() {
    return this._privateKeys;
  }
  public async ledgers() {
    return this._ledgers;
  }
  public async objectives() {
    return this._objectives;
  }
  public async channels() {
    const channels: Record<string, ChannelStoredData | MemoryChannelStoreEntry | undefined> = this
      ._channels;
    for (const key in channels) {
      channels[key] = MemoryChannelStoreEntry.fromJson(channels[key]);
    }
    return channels as Record<string, MemoryChannelStoreEntry | undefined>;
  }
  public async nonces() {
    const nonces: Record<string, BigNumber | string | undefined> = this._nonces;
    for (const key in nonces) {
      if (!this._nonces[key]) {
        nonces[key] = new BigNumber(-1);
      } else {
        nonces[key] = new BigNumber(nonces[key] as string);
      }
    }
    return nonces as Record<string, BigNumber | undefined>;
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
    this._channels[key] = value.data();
    return value;
  }
  public async addChannel(key: string, value: MemoryChannelStoreEntry) {
    if (!this._channels[key]) {
      this._channels[key] = value.data();
    }
    return value;
  }

  public async getChannel(key: string) {
    return MemoryChannelStoreEntry.fromJson(this._channels[key]);
  }

  public async setLedger(key: string, value: string) {
    this._ledgers[key] = value;
    return value;
  }

  public async getLedger(key: string) {
    return this._ledgers[key];
  }

  public async setNonce(key: string, value: BigNumber) {
    this._nonces[key] = value.toString();
    return value;
  }

  public async getNonce(key: string) {
    if (!this._nonces[key]) {
      return new BigNumber(-1);
    }
    return new BigNumber(this._nonces[key] as string);
  }

  public async setObjective(key: number, value: Objective) {
    this._objectives[key] = value;
    return value;
  }

  public async setReplaceObjectives(values: Objective[]) {
    const newObjectives: Objective[] = [];
    values.forEach(objective => {
      if (!this._objectives.includes(objective)) {
        this._objectives.push(objective);
        newObjectives.push(objective);
      }
    });
    return newObjectives;
  }

  public async getObjective(key: number) {
    return this._objectives[key];
  }
}
