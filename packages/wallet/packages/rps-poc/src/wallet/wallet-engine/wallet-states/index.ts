import BN from 'bn.js';

import { ChallengeProof } from '../../domain/ChallengeProof';

import { PlayerAState } from './PlayerA';
import { PlayerBState } from './PlayerB';

export enum PlayerIndex {
  'A'=0,
  'B'=1,
}

export type State = PlayerAState | PlayerBState;
export class InvalidStateError extends Error {
  constructor(state: State) {
    super(`Invalid state type: ${state.constructor}`);
  }
}

export class FundingFailed {
  message: string;
  constructor(message) {
    this.message = message;
  }
}
export class WaitForApproval {
  myAddress: string;
  opponentAddress: string;
  myBalance: BN;
  opponentBalance: BN;
  constructor({ myAddress, opponentAddress, myBalance, opponentBalance }) {
    this.myAddress = myAddress;
    this.opponentAddress = opponentAddress;
    this.myBalance = myBalance;
    this.opponentBalance = opponentBalance;
  }
}

export class AdjudicatorReceived {
  adjudicatorAddress: string;
  constructor(adjudicatorAddress) {
    this.adjudicatorAddress = adjudicatorAddress;
  }
}

export class Funded {
  adjudicatorAddress: string;
  constructor(adjudicatorAddress: string) {
    this.adjudicatorAddress = adjudicatorAddress;
  }
}

export class FundingDeclined{
}

export class SelectWithdrawalAddress { }

export class WaitForWithdrawal {
  depositAddress: string;
  constructor(depositAddress: string) {
    this.depositAddress = depositAddress;
  }
}

export class ChallengeRequested {
  adjudicator: string;
  challengeProof: ChallengeProof;

  constructor(adjudicator: string, challengeProof: ChallengeProof) {
    this.adjudicator = adjudicator;
    this.challengeProof = challengeProof;
  }
}

export class WaitForChallengeConcludeOrExpire {
  adjudicator: string;
  challengeProof: ChallengeProof;

  constructor(adjudicator: string, challengeProof: ChallengeProof) {
    this.adjudicator = adjudicator;
    this.challengeProof = challengeProof;
  }
}

export class ChallengeResponse{}
export class ChallengeTimeout{}
