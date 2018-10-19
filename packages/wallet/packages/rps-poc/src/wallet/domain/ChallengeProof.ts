import decode from './decode';
import {Signature} from './Signature';

export class ChallengeProof {
  // TODO: move to fmg-core
  fromState: string;
  toState: string;

  fromSignature: Signature;
  toSignature: Signature;

  constructor(
    fromState: string,
    toState: string,
    fromSignature: string,
    toSignature: string,
  ) {
    // Currently the State class in FMG core does not know about any additional game data
    // so if we decode and then call toHex we'll lose all game information
    // For now we just decode for some validation but keep the states as strings
    const decodedFromState = decode(fromState);
    const decodedToState = decode(toState);

    if (decodedToState.turnNum !== decodedFromState.turnNum + 1) {
      throw new Error("States must have consequetive turn numbers");
    }

    this.fromState = fromState;
    this.toState = toState;
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
