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

  setupGame({
    myAddr, opponentAddr, stake, initialBals,
  }) {
    const participants = [myAddr, opponentAddr];
    const channel = new Channel(`0x${'0'.repeat(61)}123`, 456, participants);

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
    const opponentMessage = new Message({ hexMessage });
    const proposal = RpsState.fromHex(opponentMessage.state);

    const { channel } = proposal;
    const { stake } = proposal;
    const balances = proposal.resolution;

    const gameState = RpsGame.initializationState({
      channel: proposal.channel,
      resolution: proposal.resolution,
      turnNum: 1,
      stake: 1,
      stateCount: 1,
    });

    const message = this.channelWallet.sign(gameState.toHex());

    const appState = new ApplicationStatesB.ReadyToSendPreFundSetup1({
      channel,
      balances,
      stake,
      signedPreFundSetup1Message: message,
    });

    return appState;
  }

  messageSent({ oldState }) {
    let newState;
    const stateType = oldState.type;

    if (stateType === ApplicationStatesA.types.ReadyToSendPreFundSetup0) {
      newState = new ApplicationStatesA.WaitForPreFundSetup1({
        ...oldState.commonAttributes,
        signedPreFundSetup0Message: oldState.message,
      });
    } else if (stateType === ApplicationStatesA.types.ReadyToSendPostFundSetup0) {
      newState = new ApplicationStatesA.WaitForPostFundSetup1({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        signedPostFundSetup0Message: oldState.message,
      });
    } else if (stateType === ApplicationStatesA.types.ReadyToSendPropose) {
      newState = new ApplicationStatesA.WaitForAccept({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        aPlay: oldState.aPlay,
        salt: oldState.salt,
        signedProposeMessage: oldState.message,
      });
    } else if (stateType === ApplicationStatesB.types.ReadyToSendPreFundSetup1) {
      newState = new ApplicationStatesB.WaitForAToDeploy({
        ...oldState.commonAttributes,
      });
    } else if (stateType === ApplicationStatesB.types.ReadyToSendPostFundSetup1) {
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
    } else if (stateType === ApplicationStatesB.types.ReadyToSendAccept) {
      newState = new ApplicationStatesB.WaitForReveal({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        bPlay: oldState.bPlay,
        signedAcceptMessage: oldState.message,
      });
    }

    return newState;
  }

  receiveMessage({ oldState, message }) {
    let newState;
    const stateType = oldState.type;
    const opponentState = RpsState.fromHex(message.state);

    if (stateType === ApplicationStatesA.types.WaitForPreFundSetup1) {
      newState = new ApplicationStatesA.ReadyToDeploy({
        ...oldState.commonAttributes,
        deploymentTransaction: 'the gameEngine needs to construct this',
      });
    } else if (stateType === ApplicationStatesA.types.WaitForPostFundSetup1) {
      newState = new ApplicationStatesA.ReadyToChooseAPlay({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        opponentMessage: message,
      });
    } else if (stateType === ApplicationStatesA.types.WaitForAccept) {
      const result = RpsGame.result(oldState.aPlay.key, opponentState.bPlay.key);

      // The opponent's state assumes that B won
      const { resolution } = opponentState;
      if (result === RpsGame.Results.TIE) {
        resolution[0] += opponentState.stake;
        resolution[1] -= opponentState.stake;
      } else if (result === RpsGame.Results.A) {
        resolution[0] += 2 * opponentState.stake;
        resolution[1] -= 2 * opponentState.stake;
      }

      const revealGameState = RpsGame.revealState({
        channel: opponentState.channel,
        resolution,
        turnNum: opponentState.turnNum + 1,
        stake: opponentState.stake,
        aPlay: oldState.aPlay,
        bPlay: opponentState.bPlay,
        salt: oldState.salt,
      });

      const revealMessage = this.channelWallet.sign(revealGameState.toHex());

      newState = new ApplicationStatesA.ReadyToSendReveal({
        adjudicator: oldState.adjudicator,
        aPlay: oldState.aPlay,
        bPlay: opponentState.bPlay,
        result,
        salt: oldState.salt,
        signedRevealMessage: revealMessage,
      });
    } else if (stateType === ApplicationStatesB.types.WaitForPostFundSetup0) {
      const gameState = RpsGame.fundConfirmationState({
        channel: opponentState.channel,
        stateCount: 1,
        resolution: opponentState.resolution,
        turnNum: 3,
        stake: opponentState.stake,
      });

      const response = this.channelWallet.sign(gameState.toHex());
      newState = new ApplicationStatesB.ReadyToSendPostFundSetup1({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        signedPostFundSetup1Message: response,
      });
    } else if (stateType === ApplicationStatesB.types.WaitForPropose) {
      newState = new ApplicationStatesB.ReadyToChooseBPlay({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        opponentMessage: message,
      });
    } else if (stateType === ApplicationStatesB.types.WaitForReveal) {
      const response = RpsGame.restingState({
        channel: opponentState.channel,
        resolution: opponentState.resolution,
        turnNum: opponentState.turnNum + 1,
        stake: opponentState.stake,
      });
      newState = new ApplicationStatesB.ReadyToSendResting({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        aPlay: opponentState.aPlay,
        bPlay: oldState.bPlay,
        result: opponentState.result,
        salt: opponentState.salt,
        balances: opponentState.resolution,
        signedRestingMessage: this.channelWallet.sign(response.toHex()),
      });
    }

    return newState;
  }

  transactionSent({ oldState }) {
    const stateType = oldState.type;
    let newState;
    if (stateType === ApplicationStatesA.types.ReadyToDeploy) {
      newState = new ApplicationStatesA.WaitForBlockchainDeploy({
        ...oldState.commonAttributes,
      });
    } else if (stateType === ApplicationStatesB.types.ReadyToDeposit) {
      newState = new ApplicationStatesB.WaitForPostFundSetup0({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
      });
    }

    return newState;
  }

  receiveEvent({ oldState, event }) {
    let newState;
    const stateType = oldState.type;

    if (stateType === ApplicationStatesA.types.WaitForBlockchainDeploy) {
      newState = new ApplicationStatesA.WaitForBToDeposit({
        ...oldState.commonAttributes,
        adjudicator: event.adjudicator,
      });
    } else if (stateType === ApplicationStatesA.types.WaitForBToDeposit) {
      const postFundSetup = RpsGame.fundConfirmationState({
        channel: oldState._channel,
        stateCount: 0,
        resolution: oldState._balances,
        turnNum: 2,
        stake: oldState.stake,
      });

      const message = this.channelWallet.sign(postFundSetup.toHex());
      newState = new ApplicationStatesA.ReadyToSendPostFundSetup0({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        signedPostFundSetup0Message: message,
      });
    } else if (stateType === ApplicationStatesB.types.WaitForAToDeploy) {
      newState = new ApplicationStatesB.ReadyToDeposit({
        ...oldState.commonAttributes,
        adjudicator: event.adjudicator,
        depositTransaction: 'the gameEngine needs to construct this',
      });
    }

    return newState;
  }

  choosePlay({ oldState, move }) {
    let gameState;
    let message;
    let newState;
    const opponentGameState = RpsState.fromHex(oldState.opponentMessage.state);

    if (oldState.type === ApplicationStatesA.types.ReadyToChooseAPlay) {
      const aPlay = RpsGame.Plays[move];
      const salt = 'salt';

      const { resolution } = opponentGameState;
      resolution[0] -= opponentGameState.stake;
      resolution[1] += opponentGameState.stake;

      gameState = RpsGame.proposeState({
        channel: opponentGameState.channel,
        resolution,
        turnNum: opponentGameState.turnNum + 1,
        stake: opponentGameState.stake,
        aPlay,
        salt,
      });

      message = this.channelWallet.sign(gameState.toHex());

      newState = new ApplicationStatesA.ReadyToSendPropose({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        aPlay,
        salt,
        signedProposeMessage: message,
      });
    } else if (oldState.type === ApplicationStatesB.types.ReadyToChooseBPlay) {
      const bPlay = RpsGame.Plays[move];
      gameState = RpsGame.acceptState({
        channel: opponentGameState.channel,
        resolution: opponentGameState.resolution,
        turnNum: opponentGameState.turnNum + 1,
        stake: opponentGameState.stake,
        bPlay,
      });

      message = this.channelWallet.sign(gameState.toHex());

      newState = new ApplicationStatesB.ReadyToSendAccept({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        bPlay,
        signedAcceptMessage: message,
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
