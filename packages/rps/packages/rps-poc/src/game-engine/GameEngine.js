import { Channel } from 'fmg-core';

import { GE_STAGES } from '../constants';
import * as ApplicationStatesA from './application-states/ApplicationStatesPlayerA';
import * as ApplicationStatesB from './application-states/ApplicationStatesPlayerB';
import { Message } from './Message';
import { RpsGame, RpsState } from '../game-rules/game-rules';

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
    const participants = [myAddr, opponentAddr];
    const channel = new Channel('0x123', 456, participants);

    const state = RpsGame.initializationState({
      channel,
      resolution: initialBals,
      turnNum: 0,
      stake,
      participants,
    });
    const message = this.channelWallet.sign(state.toHex());

    const appState = new ApplicationStatesA.ReadyToSendPreFundSetup0({
      channel,
      stake,
      balances: initialBals,
      signedPreFundSetup0Message: message.toHex(),
    });

    return appState;
  }

  prefundProposalReceived({ hexMessage }) {
    const message = new Message({ hexMessage });
    const proposal = RpsState.fromHex(message.state);

    const channel = proposal.channel;
    const stake = proposal.stake;
    const balances = proposal.resolution;

    const appState = new ApplicationStatesB.ReadyToSendPreFundSetup1({
      channel: channel,
      balances: balances,
      stake,
      signedPreFundSetup1Message: message,
    });

    return appState;
  }

  messageSent({ oldState }) {
    let newState;
    let stateType = oldState.type();
    if (stateType === ApplicationStatesA.ReadyToSendPreFundSetup0) {
      newState = new ApplicationStatesA.WaitForPreFundSetup1({
        ...oldState.commonAttributes,
        signedPreFundSetup0Message: oldState.message,
      });
    } else if (stateType === ApplicationStatesB.ReadyToSendPreFundSetup1) {
      newState = new ApplicationStatesB.WaitForAToDeploy({
        ...oldState.commonAttributes,
      });
    } else if (stateType === ApplicationStatesA.ReadyToSendPostFundSetup0) {
      newState = new ApplicationStatesA.WaitForPostFundSetup1({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        signedPostFundSetup0Message: oldState.message,
      });
    } else if (stateType === ApplicationStatesB.ReadyToSendPostFundSetup1) {
      const postFundSetup1 = RpsGame.fundConfirmationState({
        channel: oldState._channel,
        stateCount: 'count',
        resolution: oldState._balances,
        turnNum: 'turnNum',
        stake: oldState.stake,
      });
      const message = this.channelWallet.sign(postFundSetup1.toHex());
      newState = new ApplicationStatesB.WaitForPropose({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        signedPostFundSetup1Message: message,
      });
    }

    return newState;
  }

  receiveMessage({ oldState, message }) {
    let newState;
    let stateType = oldState.type();
    // TODO: use this
    // let opponentState = RpsState.fromHex(message.state);
    if (stateType === ApplicationStatesA.WaitForPreFundSetup1) {
      newState = new ApplicationStatesA.ReadyToDeploy({
        ...oldState.commonAttributes,
        deploymentTransaction: 'the gameEngine needs to construct this',
      });
    } else if (stateType === ApplicationStatesB.WaitForPostFundSetup0) {
      newState = new ApplicationStatesB.ReadyToSendPostFundSetup1({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        signedPostFundSetup1Message: message,
      });
    } else if (stateType === ApplicationStatesB.WaitForPostFundSetup0) {
      console.log('missingimp');
    }

    return newState;
  }

  transactionSent({ oldState }) {
    const stateType = oldState.type();
    let newState;
    if (stateType === ApplicationStatesA.ReadyToDeploy) {
      newState = new ApplicationStatesA.WaitForBlockchainDeploy({
        ...oldState.commonAttributes,
      });
    } else if (stateType === ApplicationStatesB.ReadyToDeposit) {
      newState = new ApplicationStatesB.WaitForPostFundSetup0({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
      });
    }

    return newState;
  }

  receiveEvent({ oldState, event }) {
    let newState;
    const stateType = oldState.type();

    if (stateType === ApplicationStatesA.WaitForBlockchainDeploy) {
      newState = new ApplicationStatesA.WaitForBToDeposit({
        ...oldState.commonAttributes,
        adjudicator: event.adjudicator,
      });
    } else if (stateType === ApplicationStatesA.WaitForBToDeposit) {
      const postFundSetup = RpsGame.fundConfirmationState({
        channel: oldState._channel,
        stateCount: 'count',
        resolution: oldState._balances,
        turnNum: 'turnNum',
        stake: oldState.stake,
      });
      const message = this.channelWallet.sign(postFundSetup.toHex());
      newState = new ApplicationStatesA.ReadyToSendPostFundSetup0({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        signedPostFundSetup0Message: message,
      });
    } else if (stateType === ApplicationStatesB.WaitForAToDeploy) {
      newState = new ApplicationStatesB.ReadyToDeposit({
        ...oldState.commonAttributes,
        adjudicator: event.adjudicator,
        depositTransaction: 'the gameEngine needs to construct this',
      });
    }

    return newState;
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
