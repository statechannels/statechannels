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

  init() {
    this.state.stage = GE_STAGES.SELECT_CHALLENGER;

    const updateObj = {
      stage: this.state.stage,
    };

    return {
      updateObj,
    };
  }

  setupGame({ myAddr, opponentAddr, stake, initialBals }) {
    let participants = [myAddr, opponentAddr];
    let channel = new Channel('0x123', '0x456', participants)

    let state = RpsGame.initializationState({ channel, resolution: initialBals, turnNum: 0, stake, participants })
    let signature = new Signature({v: '0x3', r: '0x1', s: '0x4'})
    let message = new Message({state, signature})

    console.log(initialBals)
    return new ApplicationStatesA.ReadyToSendPreFundSetup0({
      channel,
      stake,
      balances: initialBals,
      signedPreFundSetup0Message: message.toHex()
    })
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


