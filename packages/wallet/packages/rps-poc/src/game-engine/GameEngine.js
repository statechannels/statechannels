import { GE_STAGES, GE_COMMANDS } from '../constants';

export default class GameEngine {
  constructor(gameLibraryAddress, channelWallet) {
    this.gameLibraryAddress = gameLibraryAddress;
    this.channelWallet = channelWallet;
    this.state = {
      selectedPlayId: null,
      opponentMoveId: null,
      opponentId: null,
      stage: null,
      stake: null,
    };
  }

  setupGame({ myAddr, opponentAddr, stake, initialBals }) {
    this.state.stage = GE_STAGES.READY_TO_SEND_PREFUND;
    this.state.stake = stake;
    this.state.opponentId = opponentId;

    const updateObj = {
      stage: this.state.stage,
    };

    return {
      updateObj,
      command: GE_COMMANDS.SEND_PRE_FUND_MESSAGE,
    };
  }

  preFundProposalSent() {
    this.state.stage = GE_STAGES.PREFUND_SENT;

    const updateObj = {
      stage: this.state.stage,
    };

    return {
      updateObj,
    };
  }

  returnToOpponentSelection() {
    this.state.stage = GE_STAGES.SELECT_CHALLENGER;

    const updateObj = {
      stage: this.state.stage,
    };

    // TODO: should we clear all other competitor info so that the state isn't dirty with the
    // previous opponent's data?
    return {
      updateObj,
    };
  }
}


