import {
  Address,
  SignedState,
  isSimpleAllocation,
  makeDestination,
} from '@statechannels/wallet-core';
import _ from 'lodash';

import {Destination} from '../../type-aliases';

import {SimpleAllocationOutcome} from './outcome';

// This is a wrapper around SignedState that adds a few convenience methods that will
// be useful to protocols
export class State {
  private state: SignedState;
  constructor(state: SignedState) {
    this.state = state;
  }

  get turnNum(): number {
    return this.state.turnNum;
  }

  public signedBy(address: Address): boolean {
    return !!this.state.signatures.find(sig => sig.signer == address);
  }

  public get signerIndices(): number[] {
    const res = [];
    if (this.signedBy(this.state.participants[0].signingAddress)) res.push(0);
    if (this.signedBy(this.state.participants[1].signingAddress)) res.push(1);
    return res;
  }

  public get fullySigned(): boolean {
    return _.every(this.state.participants, p => this.signedBy(p.signingAddress));
  }

  public get participantDestinations(): Destination[] {
    return this.state.participants.map(p => makeDestination(p.destination));
  }

  public get simpleAllocationOutcome(): SimpleAllocationOutcome | undefined {
    if (isSimpleAllocation(this.state.outcome)) {
      return new SimpleAllocationOutcome(this.state.outcome);
    } else {
      return undefined;
    }
  }

  public advanceToOutcome(outcome: SimpleAllocationOutcome): State {
    return new State({
      ...this.state,
      turnNum: this.turnNum + 1,
      outcome: outcome.toLegacyAllocation,
    });
  }

  public get signedState(): SignedState {
    return this.state;
  }
}
