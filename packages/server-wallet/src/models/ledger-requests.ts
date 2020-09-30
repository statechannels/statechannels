import _ from 'lodash';
import {Transaction} from 'objection';

import {Bytes32} from '../type-aliases';

type LedgerRequestStatus =
  | 'pending' // Request added to DB
  | 'inflight' // Signed and sent ledger update
  | 'done' // Counterparty signed back and update was applied; ready for garbage collect ?
  | 'fail'; // Rejected for some reason (e.g., no funds, counterparty rejected)

type LedgerRequestType = {
  ledgerChannelId: Bytes32;
  fundingChannelId: Bytes32;
  status: LedgerRequestStatus;
};

export class LedgerRequests {
  // Store requests for the ledger's funds
  private pending_updates: {
    [fundingChannelId: string]: LedgerRequestType;
  } = {};

  async getRequest(
    channelId: Bytes32,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tx?: Transaction
  ): Promise<LedgerRequestType> {
    return this.pending_updates[channelId];
  }

  async setRequest(
    channelId: Bytes32,
    request: LedgerRequestType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tx?: Transaction
  ): Promise<void> {
    this.pending_updates[channelId] = request;
  }

  async setRequestStatus(
    channelId: Bytes32,
    status: LedgerRequestStatus,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tx?: Transaction
  ): Promise<void> {
    this.pending_updates[channelId].status = status;
  }

  async getPendingRequests(
    ledgerChannelId: Bytes32,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tx?: Transaction
  ): Promise<LedgerRequestType[]> {
    return _.chain(this.pending_updates)
      .mapValues()
      .filter(['ledgerChannelId', ledgerChannelId])
      .value();
  }
}
