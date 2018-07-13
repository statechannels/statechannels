
class BasePlayerA {
    constructor({ channel, stake, balances }) {
        this._channel = channel;
        this._balances = balances;
        this.stake = stake;
    }

    get myAddress() {
        return this._channel.participants[0];
    }

    get opponentAddress() {
        return this._channel.participants[1];
    }

    get channelId() {
        return this._channel.channelId;
    }

    get myBalance() {
        return this._balances[0];
    }

    get opponentBalance() {
        return this._balances[1];
    }

    get type() {
        return this.constructor.name;
    }
}

class ReadyToSendPreFundSetup0 extends BasePlayerA {
    constructor({ channel, stake, balances, signedPreFundSetup0Message }) {
        super({channel, stake, balances});
        this.message = signedPreFundSetup0Message;
    }
}

class WaitForPreFundSetup1 extends BasePlayerA { 
    constructor({ channel, stake, balances, signedPreFundSetup0Message }) {
        super({channel, stake, balances});
        this.message = signedPreFundSetup0Message; // in case a resend is required
    }
}

class ReadyToDeploy extends BasePlayerA {
    constructor({ channel, stake, balances, deploymentTransaction }) {
        super({channel, stake, balances});
        this.transaction = deploymentTransaction;
    }
}

class WaitForBlockchainDeploy extends BasePlayerA {
    constructor({ channel, stake, balances }) {
        super({channel, stake, balances});
    }
}

class WaitForBToDeposit extends BasePlayerA {
    constructor({ channel, stake, balances, adjudicator }) {
        super({channel, stake, balances});
        this.adjudicator = adjudicator;
    }
}

class ReadyToSendPostFundSetup0 extends BasePlayerA {
    constructor({ channel, stake, balances, adjudicator, signedPostFundSetup0Message }) {
        super({channel, stake, balances});
        this.adjudicator = adjudicator;
        this.message = signedPostFundSetup0Message;
    }
}

class WaitForPostFundSetup1 extends BasePlayerA {
    constructor({ channel, stake, balances, adjudicator, signedPostFundSetup0Message }) {
        super({channel, stake, balances});
        this.adjudicator = adjudicator;
        this.message = signedPostFundSetup0Message; // in case a resend is required
    }
}

class ReadyToChooseAPlay extends BasePlayerA {
    constructor({ channel, stake, balances, adjudicator }) {
        super({channel, stake, balances});
        this.adjudicator = adjudicator;
    }
}

class ReadyToSendPropose extends BasePlayerA {
    constructor({ channel, stake, balances, adjudicator, aPlay, salt, signedProposeMessage }) {
        super({channel, stake, balances});
        this.aPlay = aPlay;
        this.salt = salt;
        this.adjudicator = adjudicator;
        this.message = signedProposeMessage;
    }
}

class WaitForAccept extends BasePlayerA {
    constructor({ channel, stake, balances, adjudicator, aPlay, salt, signedProposeMessage }) {
        super({channel, stake, balances});
        this.aPlay = aPlay;
        this.salt = salt;
        this.adjudicator = adjudicator;
        this.message = signedProposeMessage; // in case a resend is required
    }
}

class ReadyToSendReveal extends BasePlayerA {
    constructor({ channel, stake, balances, adjudicator, aPlay, bPlay, result, salt, signedRevealMessage }) {
        super({channel, stake, balances});
        this.aPlay = aPlay;
        this.bPlay = bPlay;
        this.result = result; // win/lose/draw
        this.salt = salt;
        this.adjudicator = adjudicator;
        this.message = signedRevealMessage;
    }
}

class WaitForResting extends BasePlayerA {
    constructor({ channel, stake, balances, adjudicator, aPlay, bPlay, result, salt, signedRevealMessage }) {
        super({channel, stake, balances});
        this.aPlay = aPlay;
        this.bPlay = bPlay;
        this.result = result; // win/lose/draw
        this.salt = salt;
        this.adjudicator = adjudicator;
        this.message = signedRevealMessage; // in case a resend is required
    }
}

export {
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
    WaitForResting
}