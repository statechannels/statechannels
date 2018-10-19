import { State } from 'fmg-core';
import { ChallengeProof } from './ChallengeProof';
import decode from './decode';

export class ConclusionProof extends ChallengeProof {

  constructor(
    fromState: string,
    toState: string,
    fromSignature: string,
    toSignature: string,
  ) {
    super(fromState, toState, fromSignature, toSignature);
    const decodedFromState = decode(fromState);
    const decodedToState = decode(toState);
    // TODO: call SimpleAdjudicator.validConclusionProof instead
    if (decodedFromState.stateType !== State.StateType.Conclude || decodedToState.stateType!== State.StateType.Conclude) {
      throw new Error("States must be Conclude states");
    }
  }
}
