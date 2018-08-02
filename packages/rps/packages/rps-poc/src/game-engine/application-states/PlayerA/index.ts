import BaseState from '../ApplicationStates';
import ReadyToSendConclude from '../ReadyToSendConclude';
import WaitForConclude from '../WaitForConclude';

const PLAYER_INDEX = 0;

class BasePlayerA extends BaseState {
  constructor(channel, stake, balances, message=undefined) {
    super(channel, stake, balances, PLAYER_INDEX, message);
  }

  get type() {
    types;
    return types[this.constructor.name];
  }
}

class ReadyToSendPreFundSetup0 extends BasePlayerA {
  constructor({ channel, stake, balances, signedPreFundSetup0Message }) {
    super(channel, stake, balances);
    this.message = signedPreFundSetup0Message;
  }

  toJSON() {
    return {
      ...this.commonAttributes,
      message: this.message,
    };
  }

  get shouldSendMessage() {
    return true;
  }
}

class WaitForPreFundSetup1 extends BasePlayerA {
  constructor({ channel, stake, balances, signedPreFundSetup0Message }) {
    super(channel, stake, balances);
    this.message = signedPreFundSetup0Message; // in case a resend is required
  }
}

class ReadyToDeploy extends BasePlayerA {
  constructor({ channel, stake, balances, deploymentTransaction }) {
    super(channel, stake, balances);
    this.transaction = deploymentTransaction;
  }
}

class WaitForBlockchainDeploy extends BasePlayerA {
  constructor({ channel, stake, balances }) {
    super(channel, stake, balances);
  }
}

class WaitForBToDeposit extends BasePlayerA {
  constructor({ channel, stake, balances, adjudicator }) {
    super(channel, stake, balances);
    this.adjudicator = adjudicator;
  }
}

class ReadyToSendPostFundSetup0 extends BasePlayerA {
  constructor({ channel, stake, balances, adjudicator, signedPostFundSetup0Message }) {
    super(channel, stake, balances);
    this.adjudicator = adjudicator;
    this.message = signedPostFundSetup0Message;
  }

  get shouldSendMessage() {
    return true;
  }
}

class WaitForPostFundSetup1 extends BasePlayerA {
  constructor({ channel, stake, balances, adjudicator, signedPostFundSetup0Message }) {
    super(channel, stake, balances);
    this.adjudicator = adjudicator;
    this.message = signedPostFundSetup0Message; // in case a resend is required
  }
}

class ReadyToChooseAPlay extends BasePlayerA {
  constructor({ channel, stake, balances, adjudicator, opponentMessage }) {
    super(channel, stake, balances);
    this.adjudicator = adjudicator;
    this.opponentMessage = opponentMessage;
  }
}

class ReadyToSendPropose extends BasePlayerA {
  constructor({ channel, stake, balances, adjudicator, aPlay, salt, signedProposeMessage }) {
    super(channel, stake, balances);
    this.aPlay = aPlay;
    this.salt = salt;
    this.adjudicator = adjudicator;
    this.message = signedProposeMessage;
  }

  get shouldSendMessage() {
    return true;
  }
}

class WaitForAccept extends BasePlayerA {
  constructor({ channel, stake, balances, adjudicator, aPlay, salt, signedProposeMessage }) {
    super(channel, stake, balances);
    this.aPlay = aPlay;
    this.salt = salt;
    this.adjudicator = adjudicator;
    this.message = signedProposeMessage; // in case a resend is required
  }
}

class ReadyToSendReveal extends BasePlayerA {
  constructor({
    channel,
    stake,
    balances,
    adjudicator,
    aPlay,
    bPlay,
    result,
    salt,
    signedRevealMessage,
  }) {
    super(channel, stake, balances);
    this.aPlay = aPlay;
    this.bPlay = bPlay;
    this.result = result; // win/lose/draw
    this.salt = salt;
    this.adjudicator = adjudicator;
    this.message = signedRevealMessage;
  }

  get shouldSendMessage() {
    return true;
  }
}

class WaitForResting extends BasePlayerA {
  constructor({
    channel,
    stake,
    balances,
    adjudicator,
    aPlay,
    bPlay,
    result,
    salt,
    signedRevealMessage,
  }) {
    super(channel, stake, balances);
    this.aPlay = aPlay;
    this.bPlay = bPlay;
    this.result = result; // win/lose/draw
    this.salt = salt;
    this.adjudicator = adjudicator;
    this.message = signedRevealMessage; // in case a resend is required
  }
}

class ReadyToSendConcludeA extends ReadyToSendConclude {
  constructor({
    channel,
    balances,
    adjudicator,
    signedConcludeMessage,
  }) {
    super(channel, balances, PLAYER_INDEX);
    this.adjudicator = adjudicator;
    this.message = signedConcludeMessage;
  }
}

class WaitForConcludeA extends WaitForConclude {
  constructor({
    channel,
    balances,
    adjudicator,
    signedConcludeMessage,
  }) {
    super(
      channel, balances, adjudicator, PLAYER_INDEX, signedConcludeMessage,
 );
    this.adjudicator = adjudicator;
    this.message = signedConcludeMessage; // in case a resend is required
  }
}

const types = Object.freeze({
  ReadyToSendPreFundSetup0: 'ReadyToSendPreFundSetup0',
  WaitForPreFundSetup1: 'WaitForPreFundSetup1',
  ReadyToDeploy: 'ReadyToDeploy',
  WaitForBlockchainDeploy: 'WaitForBlockchainDeploy',
  WaitForBToDeposit: 'WaitForBToDeposit',
  ReadyToSendPostFundSetup0: 'ReadyToSendPostFundSetup0',
  WaitForPostFundSetup1: 'WaitForPostFundSetup1',
  ReadyToChooseAPlay: 'ReadyToChooseAPlay',
  ReadyToSendPropose: 'ReadyToSendPropose',
  WaitForAccept: 'WaitForAccept',
  ReadyToSendReveal: 'ReadyToSendReveal',
  WaitForResting: 'WaitForResting',
  ReadyToSendConcludeA: 'ReadyToSendConcludeA',
  WaitForConcludeA: 'WaitForConcludeA',
});

export {
  types,
  ReadyToSendPreFundSetup0,
  WaitForPreFundSetup1,
  ReadyToDeploy,
  WaitForBlockchainDeploy,
  WaitForBToDeposit,
  ReadyToSendPostFundSetup0,
  WaitForPostFundSetup1,
  ReadyToChooseAPlay,
  ReadyToSendPropose,
  WaitForAccept,
  ReadyToSendReveal,
  WaitForResting,
  ReadyToSendConcludeA,
  WaitForConcludeA,
};
