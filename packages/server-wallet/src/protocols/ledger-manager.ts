import _ from 'lodash';
import {Destination} from '@statechannels/wallet-core';

import {EngineResponse} from '../engine/engine-response';
import {Store} from '../engine/store';
import {LedgerRequest} from '../models/ledger-request';

import {LedgerProtocol} from './ledger-protocol';

// LedgerManagerParams
// ===================
interface LedgerManagerParams {
  store: Store;
}

export class LedgerManager {
  static create(params: LedgerManagerParams): LedgerManager {
    return new this(params.store);
  }

  private constructor(private store: Store) {}

  async crank(ledgerChannelId: string, response: EngineResponse): Promise<Destination[]> {
    return this.store.transaction(async tx => {
      // grab the requests
      // TODO: requests should be locked for update
      // TODO: fetch ledger and requests in one query
      const ledger = await this.store.getAndLockChannel(ledgerChannelId, tx);
      const requests = await this.store.getActiveLedgerRequests(ledgerChannelId, tx);

      // sanity checks
      if (!ledger.isRunning) return [];
      if (!ledger.isLedger) return [];

      // The following behavior is specific to CHALLENGING_V0 requirements
      // It will eventually be removed
      // START CHALLENGING_VO
      if (ledger.initialSupport.length === 0 && ledger.isSupported) {
        await this.store.setInitialSupport(ledger.channelId, ledger.support, tx);
      }
      // END CHALLENGING_VO

      const statesToSign = new LedgerProtocol().crank(ledger, requests);

      // save the ledger
      for (const state of statesToSign) {
        const signedState = await this.store.signState(ledger, state.signedState, tx);
        response.queueState(signedState, ledger.myIndex, ledger.channelId);
      }

      // save all requests
      await LedgerRequest.saveAll(requests, tx);
      // queue response
      response.queueChannel(ledger);

      // we need return any channels whose requests changed to a terminal state for cranking
      return _.uniq(requests.filter(r => !r.isActive).map(r => r.channelToBeFunded));
    });
  }
}
