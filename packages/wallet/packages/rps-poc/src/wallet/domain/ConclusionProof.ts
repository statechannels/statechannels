import {State} from 'fmg-core';
import decode from './decode';
import {Signature} from './Signature';

export class ConclusionProof {
  // TODO: move to fmg-core
  fromState: State;
  toState: State;

  fromSignature: Signature;
  toSignature: Signature;

  constructor(
    fromState: string,
    toState: string,
    fromSignature: string,
    toSignature: string,
  ) {
    this.fromState = decode(fromState);
    this.toState = decode(toState);

    // TODO: call SimpleAdjudicator.validConclusionProof instead
    if( this.toState.stateType !== State.StateType.Conclude || this.toState.stateType !== State.StateType.Conclude ) {
      throw new Error("States must be Conclude states");
    }
    if (this.toState.turnNum !== this.fromState.turnNum + 1) {
      throw new Error("States must have consequetive turn numbers");
    }

    this.fromSignature = new Signature(fromSignature);
    this.toSignature = new Signature(toSignature);
  }

  get r() {
    return [this.fromSignature.r, this.toSignature.r];
  }

  get s() {
    return [this.fromSignature.s, this.toSignature.s];
  }
  get v() {
    return [this.fromSignature.v, this.toSignature.v];
  } 
}
