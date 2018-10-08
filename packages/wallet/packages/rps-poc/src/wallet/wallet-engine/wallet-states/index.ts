import BN from 'bn.js';

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

export class Funded { }

export class SelectWithdrawalAddress { }

export class WaitForWithdrawal {
  depositAddress: string;
  constructor(depositAddress: string) {
    this.depositAddress = depositAddress;
  }

}