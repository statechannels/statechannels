import _ from 'lodash';
import {BN, ChannelConstants, unreachable} from '@statechannels/wallet-core';

import {State} from '../models/channel/state';
import {SimpleAllocationOutcome} from '../models/channel/outcome';
import {RichLedgerRequest} from '../models/ledger-request';

interface ReadonlyChannel extends ChannelConstants {
  myIndex: number;
  latestTurnNum: number;
  uniqueStateAt(turn: number): State | undefined;
}
export class LedgerProtocol {
  /**
   *
   * @param ledger Channel model **not mutated during cranking*
   * @param requests LedgerRequest model **to be mutated during cranking*
   * @returns states to sign for ledger channel
   */
  crank(ledger: ReadonlyChannel, requests: RichLedgerRequest[]): State[] {
    // determine which state we're in
    const ledgerState = this.determineLedgerState(ledger);
    // what happens next depends on whether we're the leader or follower
    const amLeader = ledger.myIndex === 0;
    let statesToSign: State[];

    switch (ledgerState.type) {
      case 'agreement':
        // could be in agreement through (1) follower accepting proposal, (2) leader accepting
        // counter-proposal, and having an empty queue. So both participants could be seeing
        // the agreedState for the first time
        statesToSign = amLeader
          ? this.crankAsLeaderInAgreement(ledgerState, requests)
          : this.crankAsFollowerInAgreement(ledgerState, requests);
        break;
      case 'proposal':
        // if leader, we must have created proposal, so no further action to take
        statesToSign = amLeader ? [] : this.crankAsFollowerInProposal(ledgerState, requests);
        break;
      case 'counter-proposal':
        // if follower, we must have created counter-proposal, so no further action to take
        statesToSign = amLeader ? this.crankAsLeaderInCounterProposal(ledgerState, requests) : [];
        break;
      case 'protocol-violation':
        throw new Error('protocol violation');
      default:
        unreachable(ledgerState);
    }

    return statesToSign;
  }

  private crankAsLeaderInAgreement(ledgerState: Agreement, requests: RichLedgerRequest[]): State[] {
    const {agreed} = ledgerState;
    const statesToSign = [];
    this.processAgreedState(agreed, requests);

    if (_.some(requests, r => r.isQueued)) {
      const proposedOutcome = this.buildOutcome(
        agreed,
        requests.filter(r => r.isQueued)
      );
      const proposed = agreed.advanceToOutcome(proposedOutcome);

      // need to check that we actually have a new outcome, as it could be that there wasn't
      // sufficient funding for any of the requests
      if (!proposedOutcome.isEqualTo(agreed.simpleAllocationOutcome)) {
        this.markIncludedRequestsAsPending(requests, proposed);
        statesToSign.push(proposed);
      }
    }
    return statesToSign;
  }

  private crankAsFollowerInAgreement(
    ledgerState: Agreement,
    requests: RichLedgerRequest[]
  ): State[] {
    // nothing to do here apart from update the requests according to the agreed state
    this.processAgreedState(ledgerState.agreed, requests);
    return [];
  }

  private crankAsLeaderInCounterProposal(
    ledgerState: CounterProposal,
    requests: RichLedgerRequest[]
  ): State[] {
    const {agreed, counterProposed} = ledgerState;

    const result = this.compareChangesWithRequests(requests, agreed, counterProposed);

    // if the follower is following the protocol, we should always agree with their counterProposal
    if (result.type !== 'full-agreement') throw new Error('protocol error');

    // if so, sign their state
    const stateToSign = counterProposed;

    // and proceed as if we're in the AgreementState
    const otherStatesToSign = this.crankAsLeaderInAgreement(
      {type: 'agreement', agreed: counterProposed},
      requests
    );

    return [stateToSign, ...otherStatesToSign];
  }

  private crankAsFollowerInProposal(ledgerState: Proposal, requests: RichLedgerRequest[]): State[] {
    const statesToSign = [];
    const {agreed, proposed} = ledgerState;

    this.processAgreedState(agreed, requests);

    const result = this.compareChangesWithRequests(requests, agreed, proposed);

    switch (result.type) {
      case 'full-agreement':
        statesToSign.push(proposed);
        this.processAgreedState(proposed, requests);
        break;
      case 'some-overlap':
      case 'no-overlap': {
        // in both cases we're going to make a counter-proposal either to return to the
        // original state, or to go to a state containing the overlap
        const counterProposed = proposed.advanceToOutcome(result.narrowedOutcome);
        statesToSign.push(counterProposed);
        this.markIncludedRequestsAsPending(requests, counterProposed);
        break;
      }
      default:
        unreachable(result);
    }

    return statesToSign;
  }

  private processAgreedState(agreedState: State, requests: RichLedgerRequest[]): void {
    // identify potential cancellations (defunds for which the fund is still queued or pending)
    const {cancellationDefunds, nonCancellations} = this.identifyPotentialCancellations(requests);

    // we exclude potential cancellation defunds when judging the success, otherwise a defund
    // where the fund isn't yet included would be marked a success
    this.markSuccessesAndInconsistencies(nonCancellations, agreedState);

    // in the case where we're the leader and we just approved a counterProposal, there will
    // be some pending requests that weren't included. Reset those now.
    this.resetPendingRequestsToQueued(requests);

    // cancel any pairs of matching funds/defunds that still both queued
    const nonApplicableCancellations = this.applyCancellations(
      cancellationDefunds,
      requests,
      agreedState.turnNum
    );

    // it's possible that the matching fund was marked as inconsistent above, which means
    // we now need to assess if the defund is consistent
    // (this would happen if we had duplicate funds for the same channel. We have a db constraint
    // to protect against this, but that only works if we never garbage collect or lose the db)
    this.markSuccessesAndInconsistencies(nonApplicableCancellations, agreedState);

    this.updateStateSeenAndMissedOps(requests, agreedState.turnNum);
  }

  private markSuccessesAndInconsistencies(requests: RichLedgerRequest[], agreedState: State): void {
    const agreedOutcome = agreedState.simpleAllocationOutcome;
    if (!agreedOutcome) throw Error("Ledger state doesn't have a simple allocation outcome");

    const [fundings, defundings] = _.partition(requests, r => r.isFund);

    // for defundings, one of three things is true:
    // 1. the channel doesn't appear => defunding successful
    // 2. the channel appears but with a different amount => inconsistent
    // 3. the channel appears with the same amount => no change
    for (const defund of defundings) {
      const matches = agreedOutcome.destinations.filter(d => d === defund.channelToBeFunded);
      if (matches.length > 1) {
        throw new Error(`Duplicate entries for destination`);
      } else if (matches.length === 0) {
        defund.status = 'succeeded';
        defund.lastSeenAgreedState = agreedState.turnNum;
      } else {
        const outcomeBal = agreedOutcome.balanceFor(defund.channelToBeFunded);
        const amountsMatch = outcomeBal && BN.eq(outcomeBal, defund.totalAmount);
        if (!amountsMatch) {
          defund.status = 'inconsistent';
          defund.lastSeenAgreedState = agreedState.turnNum;
        }
      }
    }

    // for fundings check which are present, and then check that the totals match
    const includedFundings = _.intersectionWith(
      fundings,
      agreedOutcome.destinations,
      (fund, dest) => fund.channelToBeFunded === dest
    );
    includedFundings.forEach(f => {
      const outcomeBal = agreedOutcome.balanceFor(f.channelToBeFunded);
      const amountsMatch = outcomeBal && BN.eq(outcomeBal, f.totalAmount);
      f.status = amountsMatch ? 'succeeded' : 'inconsistent';
      f.lastSeenAgreedState = agreedState.turnNum;
    });
  }

  private updateStateSeenAndMissedOps(requests: RichLedgerRequest[], turnNum: number) {
    requests
      .filter(r => r.isQueued)
      .forEach(r => {
        if (r.lastSeenAgreedState !== turnNum) {
          if (r.lastSeenAgreedState) r.missedOpportunityCount = 1 + r.missedOpportunityCount;
          r.lastSeenAgreedState = turnNum;
        }
      });
  }

  private resetPendingRequestsToQueued(requests: RichLedgerRequest[]) {
    requests.filter(r => r.isPending).forEach(r => (r.status = 'queued'));
  }

  private markIncludedRequestsAsPending(requests: RichLedgerRequest[], proposed: State): void {
    const proposedOutcome = proposed.simpleAllocationOutcome;
    if (!proposedOutcome) throw Error("Ledger state doesn't have a simple allocation outcome");

    const [fundings, defundings] = _.partition(
      requests.filter(r => r.isQueued),
      r => r.isFund
    );

    // for defundings, mark any the aren't present as successful
    const missingDefundings = _.differenceWith(
      defundings,
      proposedOutcome.destinations,
      (defund, dest) => defund.channelToBeFunded === dest
    );
    missingDefundings.forEach(d => (d.status = 'pending'));

    // for fundings check which are present, and then check that the totals match
    const includedFundings = _.intersectionWith(
      fundings,
      proposedOutcome.destinations,
      (fund, dest) => fund.channelToBeFunded === dest
    );
    includedFundings.forEach(f => {
      const outcomeBal = proposedOutcome.balanceFor(f.channelToBeFunded);
      const amountsMatch = outcomeBal && BN.eq(outcomeBal, f.totalAmount);
      // amounts sould always match, as proposedOutcome is always called with a state we constructed
      if (!amountsMatch) throw new Error("amounts don't match");

      f.status = 'pending';
    });
  }

  private identifyPotentialCancellations(
    requests: RichLedgerRequest[]
  ): {cancellationDefunds: RichLedgerRequest[]; nonCancellations: RichLedgerRequest[]} {
    const [fundings, defundings] = _.partition(requests, r => r.isFund);

    const cancellationDefunds = _.intersectionWith(
      defundings,
      fundings,
      (x, y) => x.channelToBeFunded === y.channelToBeFunded
    );
    const nonCancellations = _.difference(requests, cancellationDefunds);

    // sanity check: cancellationDefunds should always be queued
    for (const d of cancellationDefunds) {
      if (!d.isQueued) throw new Error(`cancellation defund is not in queued state: ${d.$id}`);
    }

    return {cancellationDefunds, nonCancellations};
  }

  // find the corresponding fund for each defund and cancel it if it's in the queued state
  // returns the cancellations that can't be applied (becuase their parnter has already been confirmed)
  private applyCancellations(
    cancellations: RichLedgerRequest[],
    requests: RichLedgerRequest[],
    turnNum: number
  ): RichLedgerRequest[] {
    const nonApplicableCancellations = [];
    for (const defund of cancellations) {
      const fund = requests.find(r => r.isFund && r.channelToBeFunded === defund.channelToBeFunded);
      if (fund && fund.isQueued) {
        fund.status = 'cancelled';
        fund.lastSeenAgreedState = turnNum;
        defund.status = 'cancelled';
        defund.lastSeenAgreedState = turnNum;
      } else {
        nonApplicableCancellations.push(defund);
      }
    }
    return nonApplicableCancellations;
  }

  // compareChangesWithRequest
  // - fullAgreement => agree on channels and outcome
  // - someoverlap, narrowedOutcome => have removed
  // - noOverlap
  private compareChangesWithRequests(
    requests: RichLedgerRequest[],
    baselineState: State,
    candidateState: State
  ): CompareChangesWithRequestsResult {
    const baselineOutcome = baselineState.simpleAllocationOutcome;
    const candidateOutcome = candidateState.simpleAllocationOutcome;

    if (!baselineOutcome || !candidateOutcome)
      throw Error("Ledger state doesn't have simple allocation outcome");

    const changedDestinations = _.xor(baselineOutcome.destinations, candidateOutcome.destinations);

    if (changedDestinations.length === 0) return {type: 'full-agreement'};

    // we don't want to mistakenly think that defund cancellations are included in the state, so
    // we need to exclude them in what follows
    const {nonCancellations} = this.identifyPotentialCancellations(requests);

    // identify which changes from the proposal are also in our list of requests
    const overlappingRequests = nonCancellations.filter(req =>
      changedDestinations.includes(req.channelToBeFunded)
    );

    if (overlappingRequests.length === 0)
      return {type: 'no-overlap', narrowedOutcome: baselineOutcome};

    // build the outcome
    const calculatedOutcome = this.buildOutcome(baselineState, overlappingRequests);

    if (overlappingRequests.length === changedDestinations.length) {
      // we've have full overlap
      if (candidateOutcome.isEqualTo(calculatedOutcome)) {
        // all agree. happy days.
        return {type: 'full-agreement'};
      } else {
        // uh oh. We agree on the requests but not the outcome. Coding error alert
        throw new Error('Outcomes inconsistent');
      }
    } else {
      return {type: 'some-overlap', narrowedOutcome: calculatedOutcome};
    }
  }

  private determineLedgerState(ledger: ReadonlyChannel): LedgerState {
    const [leader, follower] = ledger.participants.map(p => p.signingAddress);
    const latestTurnNum = ledger.latestTurnNum;

    const latestState = ledger.uniqueStateAt(latestTurnNum);
    if (!latestState) return {type: 'protocol-violation'};

    if (latestState.fullySigned) {
      return {type: 'agreement', agreed: latestState};
    }

    const penultimateState = ledger.uniqueStateAt(latestTurnNum - 1);
    if (!penultimateState) return {type: 'protocol-violation'};

    if (penultimateState.fullySigned) {
      if (latestState.signedBy(leader)) {
        return {type: 'proposal', proposed: latestState, agreed: penultimateState};
      } else {
        return {type: 'protocol-violation'};
      }
    }

    const antepenultimateState = ledger.uniqueStateAt(latestTurnNum - 2);
    if (!antepenultimateState) return {type: 'protocol-violation'};

    if (
      antepenultimateState.fullySigned &&
      penultimateState.signedBy(leader) &&
      latestState.signedBy(follower)
    ) {
      return {
        type: 'counter-proposal',
        counterProposed: latestState,
        proposed: penultimateState,
        agreed: antepenultimateState,
      };
    } else {
      return {type: 'protocol-violation'};
    }
  }

  private buildOutcome(state: State, requests: RichLedgerRequest[]): SimpleAllocationOutcome {
    if (!state.simpleAllocationOutcome)
      throw Error("Ledger doesn't have simple allocation outcome");

    let currentOutcome = state.simpleAllocationOutcome.dup();

    // we should do any defunds first
    for (const defundReq of requests.filter(r => r.isDefund)) {
      const updatedOutcome = currentOutcome.remove(
        defundReq.channelToBeFunded,
        state.participantDestinations,
        [defundReq.amountA, defundReq.amountB]
      );

      if (updatedOutcome) {
        currentOutcome = updatedOutcome;
      } else {
        // the only way removal fails is if the refund amounts don't match the amount in the channel
        // in that case the request is not viable and should be marked as inconsistent
        defundReq.status = 'inconsistent';
      }
    }

    // then we should do any fundings
    // NOTE: new requests MUST be appended in lexographical order by channelId
    // this isn't strictly necessary, but removes any ambiguity about the format of the state
    for (const fundingReq of _.sortBy(
      requests.filter(r => r.isFund),
      'channelToBeFunded'
    )) {
      const updatedOutcome = currentOutcome.add(
        fundingReq.channelToBeFunded,
        state.participantDestinations,
        [fundingReq.amountA, fundingReq.amountB]
      );

      if (updatedOutcome) {
        currentOutcome = updatedOutcome;
      } else {
        // if funding failed, it means that there aren't enough funds left in the channel
        // so mark the request as failed
        // TODO: do we actually want to do this here?
        fundingReq.status = 'insufficient-funds';
      }
    }

    return currentOutcome;
  }
}

// LedgerState
// ===========
type LedgerState = Agreement | Proposal | CounterProposal | ProtocolViolation;

type Agreement = {type: 'agreement'; agreed: State};
type Proposal = {type: 'proposal'; agreed: State; proposed: State};
type CounterProposal = {
  type: 'counter-proposal';
  counterProposed: State;
  proposed: State;
  agreed: State;
};
type ProtocolViolation = {type: 'protocol-violation'};

// CompareChangesWithRequestsResult
// ================================
type CompareChangesWithRequestsResult = FullAgreement | SomeOverlap | NoOverlap;

type FullAgreement = {type: 'full-agreement'};
type SomeOverlap = {type: 'some-overlap'; narrowedOutcome: SimpleAllocationOutcome};
type NoOverlap = {type: 'no-overlap'; narrowedOutcome: SimpleAllocationOutcome};
