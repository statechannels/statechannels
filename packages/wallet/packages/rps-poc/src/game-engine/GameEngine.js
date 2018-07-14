import { GE_STAGES, GE_COMMANDS } from '../constants';
import * as ApplicationStatesA from './application-states/ApplicationStatesPlayerA';
import * as ApplicationStatesB from './application-states/ApplicationStatesPlayerB';
import { Message } from './message';
import { RpsGame, RpsState } from '../game-rules/game-rules';
import { Channel } from 'fmg-core';
import { State } from '../../../minimal_viable_force_move_games/packages/fmg-core/src';

export default class GameEngine {
  constructor({ gameLibraryAddress, channelWallet, applicationController }) {
    this.gameLibraryAddress = gameLibraryAddress;
    this.channelWallet = channelWallet;
    this.applicationController = applicationController;
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

    this.appState = new ApplicationStatesA.ReadyToSendPreFundSetup0({
      channel,
      stake,
      balances: initialBals,
      signedPreFundSetup0Message: message.toHex()
    })

    return this.appState;
  }

  prefundProposalReceived(hexMessage) {
    let message = new Message({ hexMessage })
    let proposal = RpsState.fromHex(message.state);

    let channel = proposal.channel;
    let stake = proposal.stake;
    let balances = proposal.balances;

    this.appState = new ApplicationStatesB.ReadyToSendPreFundSetup1({
      channel,
      stake,
      balances,
      signedPreFundSetup1Message: message
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
    // } else if (stateType === ApplicationStatesA.WaitForPreFundSetup1) {
    //   this.appState = new ApplicationStatesA.ReadyToDeploy({
    //     ...this.appState.commonAttributes,
    //     deploymentTransaction: this.applicationController.deployGame()
    //   })
    } else if (stateType === ApplicationStatesB.ReadyToSendPreFundSetup1) {
      this.appState = new ApplicationStatesB.WaitForAToDeploy({
        ...this.appState.commonAttributes
      })
    } else if (stateType === ApplicationStatesA.ReadyToSendPostFundSetup0) {
      this.appState = new ApplicationStatesA.WaitForPostFundSetup1({
        ...this.appState.commonAttributes,
        adjudicator: this.appState.adjudicator,
        signedPostFundSetup0Message: this.appState.message
      })
    } else if (stateType === ApplicationStatesB.ReadyToSendPostFundSetup1) {
      let postFundSetup1 = RpsGame.fundConfirmationState({
        channel: this.appState._channel,
        stateCount: 'count',
        resolution: this.appState._balances,
        turnNum: 'turnNum',
        stake: this.appState.stake
      })
      let message = this.channelWallet.sign(postFundSetup1.toHex())
      this.appState = new ApplicationStatesB.WaitForPropose({
        ...this.appState.commonAttributes,
        adjudicator: this.appState.adjudicator,
        signedPostFundSetup1Message: message
      })
    }

    return this.appState;
  }

  receiveMessage(message) {
    let stateType = this.appState.constructor;
    let opponentState = RpsState.fromHex(message.state)
    if (stateType === ApplicationStatesA.WaitForPreFundSetup1) {
      this.appState = new ApplicationStatesA.ReadyToDeploy({
        ...this.appState.commonAttributes,
        deploymentTransaction: this.applicationController.deployGame()
      })
    } else if (stateType === ApplicationStatesB.WaitForPostFundSetup0) {
      this.appState = new ApplicationStatesB.ReadyToSendPostFundSetup1({
        ...this.appState.commonAttributes,
        adjudicator: this.appState.adjudicator,
        signedPostFundSetup1Message: message
      })
    }

    return this.appState;
  }

  transactionSent() {
    let stateType = this.appState.constructor;
    if (stateType === ApplicationStatesA.ReadyToDeploy) {
      this.appState = new ApplicationStatesA.WaitForBlockchainDeploy({
        ...this.appState.commonAttributes
      })
    } else if (stateType === ApplicationStatesB.ReadyToDeposit) {
      this.appState = new ApplicationStatesB.WaitForPostFundSetup0({
        ...this.appState.commonAttributes,
        adjudicator: this.appState.adjudicator
      })
    }

    return this.appState;
  }

  receiveEvent(event) {
    let stateType = this.appState.constructor;

    if (stateType == ApplicationStatesA.WaitForBlockchainDeploy) {
      this.appState = new ApplicationStatesA.WaitForBToDeposit({
        ...this.appState.commonAttributes,
        adjudicator: event.adjudicator
      })
    } else if (stateType === ApplicationStatesA.WaitForBToDeposit) {
      let postFundSetup = RpsGame.fundConfirmationState({
        channel: this.appState._channel,
        stateCount: 'count',
        resolution: this.appState._balances,
        turnNum: 'turnNum',
        stake: this.appState.stake
      })
      let message = this.channelWallet.sign(postFundSetup.toHex())
      this.appState = new ApplicationStatesA.ReadyToSendPostFundSetup0({
        ...this.appState.commonAttributes,
        adjudicator: this.appState.adjudicator,
        signedPostFundSetup0Message: message
      })
    } else if (stateType === ApplicationStatesB.WaitForAToDeploy) {
      this.appState = new ApplicationStatesB.ReadyToDeposit({
        ...this.appState.commonAttributes,
        adjudicator: event.adjudicator,
        depositTransaction: this.applicationController.depositFunds()
      })
    }

    return this.appState;
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


