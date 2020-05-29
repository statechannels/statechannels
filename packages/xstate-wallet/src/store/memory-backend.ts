import {BigNumber} from 'ethers';

import {Objective, DBBackend, DomainBudget, ChannelStoredData, ObjectStores, TXMode} from './types';
import * as _ from 'lodash';
import {ChannelStoreEntry} from './channel-store-entry';

export class MemoryBackend implements DBBackend {
  private _channels: Record<string, ChannelStoredData | undefined> = {};
  private _objectives: Objective[] = [];
  private _nonces: Record<string, string | undefined> = {};
  private _privateKeys: Record<string, string | undefined> = {};
  private _ledgers: Record<string, string | undefined> = {};
  private _budgets: Record<string, DomainBudget | undefined> = {};

  public async initialize(cleanSlate = false) {
    if (cleanSlate) {
      this._channels = {};
      this._objectives = [];
      this._nonces = {};
      this._privateKeys = {};
      this._ledgers = {};
      this._budgets = {};
    }
  }
  // Generic Getters

  public async privateKeys() {
    return _.cloneDeep(this._privateKeys);
  }
  public async ledgers() {
    return _.cloneDeep(this._ledgers);
  }
  public async objectives() {
    return _.cloneDeep(this._objectives);
  }
  public async channels() {
    const channelsData: Record<string, ChannelStoredData | undefined> = _.cloneDeep(this._channels);
    const channels = {};
    for (const channelId of Object.keys(channelsData)) {
      channels[channelId] = new ChannelStoreEntry(channelsData[channelId] as ChannelStoredData);
    }

    return channels as Record<string, ChannelStoreEntry | undefined>;
  }
  public async nonces() {
    const nonces: Record<string, BigNumber | string | undefined> = this._nonces;
    for (const key in nonces) {
      if (!this._nonces[key]) {
        nonces[key] = BigNumber.from(-1);
      } else {
        nonces[key] = BigNumber.from(nonces[key] as string);
      }
    }
    return nonces as Record<string, BigNumber | undefined>;
  }

  // Individual Getters/setters
  public async getBudget(key: string) {
    return this._budgets[key];
  }

  public async setBudget(key: string, value: DomainBudget) {
    this._budgets[key] = value;
    return value;
  }
  public async deleteBudget(key: string) {
    delete this._budgets[key];
  }
  public async setPrivateKey(key: string, value: string) {
    this._privateKeys[key] = value;
    return value;
  }

  public async getPrivateKey(key: string) {
    return this._privateKeys[key];
  }

  public async setChannel(key: string, value: ChannelStoredData) {
    this._channels[key] = value;
    return value;
  }

  public async getChannel(key: string) {
    const data = this._channels[key];
    if (!data) return;
    else return new ChannelStoreEntry(data);
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
    return BigNumber.from(this._nonces[key] as string);
  }

  public async getNonce(key: string) {
    if (!this._nonces[key]) {
      return BigNumber.from(-1);
    }
    return BigNumber.from(this._nonces[key] as string);
  }

  public async setObjective(key: number, value: Objective) {
    this._objectives[key] = value;
    return value;
  }

  public async getObjective(key: number) {
    return this._objectives[key];
  }

  public async transaction<T>(_mode: TXMode, _stores: ObjectStores[], cb: (tx: any) => Promise<T>) {
    return cb({abort: () => null});
  }

  public transactionOngoing = false;
}
