import { State, toHex32, padBytes32 } from 'fmg-core';

class PaymentGame {
  static preFundSetupState({ channel, resolution, turnNum, stateCount }) {
      return new InitializationState(...arguments);
  }
  static PostFundSetupState({ channel, resolution, turnNum, stateCount }) {
      return new FundConfirmationState(...arguments);
  }
  static gameState({ channel, resolution, turnNum }) {
      return new GameState(...arguments);
  }
  static concludeState({ channel, resolution, turnNum }) {
      return new ConcludeState(...arguments);
  }
}

class InitializationState extends State {
    constructor({ channel, resolution, turnNum, stateCount }) {
        super(...arguments);
        this.stateType = State.StateType.PreFundSetup;
    }
}

class FundConfirmationState extends State {
    constructor({ channel, resolution, turnNum, stateCount }) {
        super(...arguments);
        this.stateType = State.StateType.PostFundSetup;
    }
}

class GameState extends State {
    constructor({ channel, resolution, turnNum }) {
        super(...arguments);
        this.stateType = State.StateType.Game;
    }
}

class ConcludeState extends State {
    constructor({ channel, resolution, turnNum }) {
        super(...arguments);
        this.stateType = State.StateType.Conclude;
    }
}

export { PaymentGame };
