import _ from 'lodash';
import {Transaction} from 'objection';

import {Bytes32} from '../type-aliases';

// TODO: Is this the same as an objective?
export type LedgerRequestStatus =
  | 'pending' // Request added to DB to be approved or rejected by queue
  // | 'rejected' // Rejected due to lack of available funds TODO: Implement
  | 'succeeded' // Ledger update became supported and thus request succeeded
  | 'failed'; // Rejected for an unexpected reason (some error occurred) TODO: Implement

export type LedgerRequestType = {
  ledgerChannelId: Bytes32;
  fundingChannelId: Bytes32;
  status: LedgerRequestStatus;
  type: 'fund' | 'defund';
};

// FIXME: (SQL Ledger Models)
export class LedgerRequests {
  // Store requests for the ledger's funds
  private requests: {
    [fundingChannelId: string]: LedgerRequestType;
  } = {};

  async getRequest(
    channelId: Bytes32,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tx?: Transaction
  ): Promise<LedgerRequestType> {
    return this.requests[channelId];
  }

  async setRequest(
    channelId: Bytes32,
    request: LedgerRequestType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tx?: Transaction
  ): Promise<void> {
    if (this.requests[channelId] && this.requests[channelId].type === request.type)
      throw new Error('LedgerRequest:setRequest channelId already has pending request');
    this.requests[channelId] = request;
  }

  async setRequestStatus(
    channelId: Bytes32,
    status: LedgerRequestStatus,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tx?: Transaction
  ): Promise<void> {
    this.requests[channelId].status = status;
  }

  async getPendingRequests(
    ledgerChannelId: Bytes32,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tx?: Transaction
  ): Promise<LedgerRequestType[]> {
    return _.chain(this.requests)
      .mapValues()
      .filter(['ledgerChannelId', ledgerChannelId])
      .value();
  }
}
