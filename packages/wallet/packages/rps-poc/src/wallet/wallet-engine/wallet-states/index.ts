import BN from 'bn.js';

import { ChallengeProof } from '../../domain/ChallengeProof';

import { PlayerAState } from './PlayerA';
import { PlayerBState } from './PlayerB';

export enum PlayerIndex {
  'A' = 0,
  'B' = 1,
}

export type State = PlayerAState | PlayerBState;
export class InvalidStateError extends Error {
  constructor(state: State) {
    super(`Invalid state type: ${state.constructor}`);
  }
}

export class FundingUnderway {
  myBalance: BN;
  constructor(myBalance: BN) {
    this.myBalance = myBalance;
  }
}

export class FundingFailed {
  message: string;
  myBalance: BN;
  constructor(message, myBalance) {
    this.message = message;
    this.myBalance = myBalance;
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
  myBalance: BN;
  constructor(adjudicatorAddress, myBalance: BN) {
    this.adjudicatorAddress = adjudicatorAddress;
    this.myBalance = myBalance;
  }
}

export class Funded {
  adjudicatorAddress: string;
  myBalance: BN;
  constructor(adjudicatorAddress: string, myBalance: BN) {
    this.adjudicatorAddress = adjudicatorAddress;
    this.myBalance = myBalance;
  }
}

export class FundingDeclined {
}

export class ConfirmWithdrawal{}
export class SelectWithdrawalAddress { 
  withdrawalAmount:BN;
  constructor(withdrawalAmount){
    this.withdrawalAmount = withdrawalAmount;
  }
}

export class WithdrawalComplete{
  withdrawalAmount:BN;
  constructor(withdrawalAmount:BN){
    this.withdrawalAmount = withdrawalAmount;
  }
}

export class WaitForWithdrawal {
  depositAddress: string;
  withdrawalAmount: BN;
  constructor(depositAddress: string, withdrawalAmount:BN) {
    this.depositAddress = depositAddress;
    this.withdrawalAmount = withdrawalAmount;
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

export class ChallengeResponse { }
export class ChallengeTimeout { }
