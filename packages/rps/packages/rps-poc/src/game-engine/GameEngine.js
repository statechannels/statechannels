import { GE_STAGES, GE_COMMANDS } from '../constants';
import * as ApplicationStatesA from './application-states/ApplicationStatesPlayerA';
import * as ApplicationStatesB from './application-states/ApplicationStatesPlayerB';
import { Message } from './message';
import { RpsGame, RpsState } from '../game-rules/game-rules';
import { Channel } from 'fmg-core';
import { State } from '../../../minimal_viable_force_move_games/packages/fmg-core/src';

export default class GameEngine {
  constructor({ gameLibraryAddress, channelWallet }) {
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
    let message = this.channelWallet.sign(state.toHex())
    //  new Message({state, signature})

    this.appState = new ApplicationStatesA.ReadyToSendPreFundSetup0({
      channel,
      stake,
      balances: initialBals,
      signedPreFundSetup0Message: message.toHex()
    })

    return this.appState;
  }

  prefundProposalReceived(proposal) {
    proposal = RpsState.fromHex(proposal);
    let channel = proposal.channel;
    let stake = proposal.stake;
    let balances = proposal.balances;
    let signature = 'foo';
    let message = new Message({
      state: proposal,
      signature
    })

    this.appState = new ApplicationStatesB.ReadyToSendPreFundSetup1({
      channel,
      stake,
      balances,
      signedPreFundSetup1Message: proposal.message
    })

    return this.appState;
  }

  messageSent() {
    let stateType = this.appState.constructor;
    if (stateType === ApplicationStatesA.ReadyToSendPreFundSetup0) {
      this.appState = new ApplicationStatesA.WaitForPreFundSetup1({
        ...this.appState.commonAttributes,
        signedPreFundSetup0Message: this.appState.message
      })
    } else if (stateType === ApplicationStatesB.ReadyToSendPreFundSetup1) {
      this.appState = new ApplicationStatesB.WaitForAToDeploy(this.appState.commonAttributes)
    } else if (stateType === ApplicationStatesA.WaitForPreFundSetup1) {
      this.appState = new ApplicationStatesA.ReadyToDeploy({
        ...this.appState.commonAttributes,
        deploymentTransaction: 'TODO: replace me'
      })
    } else if (stateType === ApplicationStatesB.ReadyToSendPreFundSetup1) {
      console.log('deploy B')
      this.appState = new ApplicationStatesB.WaitForAToDeploy({
        ...this.appState.commonAttributes
      })
    }

    return this.appState;
  }

  messageReceived(message) {
    let stateType = this.appState.constructor;
    let opponentState = RpsState.fromHex(message.state)
    if (stateType === ApplicationStatesA.WaitForPreFundSetup1) {
    }
  }

  returnToOpponentSelection() {
    this.appState.stage = GE_STAGES.SELECT_CHALLENGER;

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


