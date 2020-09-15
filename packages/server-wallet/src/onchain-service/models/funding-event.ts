import {Model} from 'objection';

import {Uint256, Bytes32, Address, Uint48} from '../../type-aliases';
import {ChainEventNames, ChannelEventRecordMap} from '../types';

export const REQUIRED_COLUMNS = {
  transactionHash: 'transactionHash',
  type: 'type',
  blockNumber: 'blockNumber',
  final: 'final',
  channelId: 'channelId',
  amount: 'amount',
  destinationHoldings: 'destinationHoldings',
  assetHolderAddress: 'assetHolderAddress',
};
export interface RequiredColumns {
  readonly transactionHash: Bytes32;
  readonly type: ChainEventNames;
  readonly blockNumber: Uint48;
  readonly final: boolean; // `true` after n blocks
  readonly channelId: Bytes32;
  readonly amount: Uint256;
  readonly destinationHoldings: Uint256;
  readonly assetHolderAddress: Address;
}

export class FundingEvent extends Model implements RequiredColumns {
  // Setup
  static tableName = 'funding_event';

  // Required columns
  readonly transactionHash!: Bytes32;
  readonly type!: ChainEventNames;
  readonly blockNumber!: Uint48;
  readonly final!: boolean; // `true` after n blocks
  readonly channelId!: Bytes32;
  readonly amount!: Uint256;
  readonly destinationHoldings!: Uint256;
  readonly assetHolderAddress!: Address;

  static get idColumn(): string[] {
    return ['transactionHash'];
  }

  static async getEvents(_channelId: Bytes32): Promise<FundingEvent[]> {
    throw new Error('Method not implemented');
  }

  static async getLatestEvent<T extends ChainEventNames>(
    _event: T,
    _channelId: Bytes32
  ): Promise<FundingEvent> {
    throw new Error('Method not implemented');
  }

  static async saveEvent<T extends ChainEventNames>(
    _channelId: Bytes32,
    _data: ChannelEventRecordMap[T]
  ): Promise<void> {
    throw new Error('Method not implemented');
  }

  static async registerChannel(_channelId: Bytes32): Promise<void> {
    throw new Error('Method not implemented');
  }

  static async hasChannel(_channelId: Bytes32): Promise<void> {
    throw new Error('Method not implemented');
  }
}
