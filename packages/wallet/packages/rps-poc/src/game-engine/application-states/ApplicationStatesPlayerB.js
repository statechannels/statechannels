
class BasePlayerB {
    constructor({ channel, stake, balances }) {
        this._channel = channel;
        this._balances = balances;
        this.stake = stake;
    }

    get myAddress() {
        return this._channel.participants[1];
    }

    get opponentAddress() {
        return this._channel.participants[0];
    }

    get channelId() {
        return this._channel.channelId;
    }

    get myBalance() {
        return this._balances[1];
    }

    get opponentBalance() {
        return this._balances[0];
    }

    get type() {
        return this.constructor.name;
    }
}

class ReadyToSendPreFundSetup1 extends BasePlayerB {
    constructor({ channel, stake, balances, signedPreFundSetup1Message }) {
        super({ channel, stake, balances });
        this.message = signedPreFundSetup1Message;
    }
}

class WaitForAToDeploy extends BasePlayerB {
    constructor({ channel, stake, balances }) {
        super({ channel, stake, balances });
    }
}

class ReadyToDeposit extends BasePlayerB {
    constructor({ channel, stake, balances, adjudicator, depositTransaction }) {
        super({ channel, stake, balances });
        this.adjudicator = adjudicator; // address of adjudicator
        this.transaction = depositTransaction;
    }
}

class WaitForBlockchainDeposit extends BasePlayerB {
    constructor({ channel, stake, balances, adjudicator }) {
        super({ channel, stake, balances });
        this.adjudicator = adjudicator; // address of adjudicator
    }
}

class WaitForPostFundSetup0 extends BasePlayerB {
    constructor({ channel, stake, balances, adjudicator }) {
        super({ channel, stake, balances });
        this.adjudicator = adjudicator; // address of adjudicator
    }
}

class ReadyToSendPostFundSetup1 extends BasePlayerB {
    constructor({ channel, stake, balances, adjudicator, signedPostFundSetup1Message }) {
        super({ channel, stake, balances });
        this.adjudicator = adjudicator;
        this.message = signedPostFundSetup1Message;
    }
}

class WaitForPropose extends BasePlayerB {
    constructor({ channel, stake, balances, adjudicator, signedPostFundSetup1Message }) {
        super({ channel, stake, balances });
        this.adjudicator = adjudicator;
        this.message = signedPostFundSetup1Message; // in case resend necessary
    }
}

class ReadyToChooseBPlay extends BasePlayerB {
    constructor({ channel, stake, balances, adjudicator }) {
        super({ channel, stake, balances });
        this.adjudicator = adjudicator;
    }
}

class ReadyToSendAccept extends BasePlayerB {
    constructor({ channel, stake, balances, adjudicator, bPlay, signedAcceptMessage }) {
        super({ channel, stake, balances });
        this.adjudicator = adjudicator;
        this.bPlay = bPlay;
        this.message = signedAcceptMessage;
    }
}

class WaitForReveal extends BasePlayerB {
    constructor({ channel, stake, balances, adjudicator, bPlay, signedAcceptMessage }) {
        super({ channel, stake, balances });
        this.adjudicator = adjudicator;
        this.bPlay = bPlay;
        this.message = signedAcceptMessage; // in case resend necessary
    }
}

class ReadyToSendResting extends BasePlayerB {
    constructor({ channel, stake, balances, adjudicator, aPlay, bPlay, result, salt, signedRestingMessage }) {
        super({ channel, stake, balances });
        this.aPlay = aPlay;
        this.bPlay = bPlay;
        this.result = result; // win/lose/draw
        this.salt = salt;
        this.adjudicator = adjudicator;
        this.message = signedRestingMessage; // in case a resend is required
    }
}

export {
    ReadyToSendPreFundSetup1,
    WaitForAToDeploy,
    ReadyToDeposit,
    WaitForBlockchainDeposit,
    WaitForPostFundSetup0,
    ReadyToSendPostFundSetup1,
    WaitForPropose,
    ReadyToChooseBPlay,
    ReadyToSendAccept,
    WaitForReveal,
    ReadyToSendResting,
}