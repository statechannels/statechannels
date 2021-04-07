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

// Ledger Update algorithm:
// ------------------------
//
// Define the "leader" of the channel to be the first participant.
// Let the other participant be the "follower".
//
// If both parties follow the protocol, the ledger exists in one of three possible states:
// 1. Agreement (the latest state is double-signed)
// 2. Proposal (latest states are: double-signed, leader-signed)
// 3. Counter-proposal (latest states are: double-signed, leader-signed, follower-signed)
//
// If we ever find ourselves not in one of these states, declare a protocol violation and
// exit the channel.
//
// The leader acts as follows:
// * In Agreement, the leader takes all of their queued updates, formulates them into a new state
//   and sends it to the follower. The state is now Proposal
// * In Proposal, does nothing
// * In Counter-proposal, confirms that all the updates are in the queue, and double signs
//   The state is now Agreement.
//
// The follower acts as follows:
// * In Agreement, does nothing
// * In Proposal:
//    * If all updates are in the queue, double-signs. The state is now Agreement.
//    * Otherwise, removes the states that are not in queue and formulates new state.
//      The state is now Counter-proposal
// * In Counter-proposal, does nothing
//
//
// Managing the request queue:
// ---------------------------
//
// Requests can exist in one of 6 states:
// 1. queued - when waiting to go into a proposal
// 2. pending - request included in current proposal/counter-proposal signed by us
//    (☝️ these two states are considered 'active')
// 3. success - [terminal] when included in an agreed state
// 4. cancelled - [terminal] if a defund is sent before the fund was included in the ledger
// 5. insufficient-funds - [terminal] if there aren't enough funds in the ledger
// 6. inconsistent - [terminal] requested channel is in the ledger but with a different amount
// 7. failed - [terminal] if the ledger ends due to a closure or a protocol exception
//
//      ┌────────────────────────┐
//      │                        v
//   queued <---> pending ---> success               failed [from any state]
//      │
//      ├──────────────────┐──────────────────────┐
//      v                  v                      v
//   cancelled      insufficient-funds       inconsistent
//
// Requests also maintain a missedOpportunityCount and a lastAgreedStateSeen.
//
// The missedOpportunityCount tracks how many agreed states the request has failed to be
// included in. Objectives can use this to determine whether a request has stalled (e.g. if
// their counterparty isn't processing the objective anymore).
//
// The lastAgreedStateSeen is a piece of book-keeping to so that the LedgerManager can
// accurately update the missedOpportunityCount.
//
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
