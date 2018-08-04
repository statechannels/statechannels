import { Channel } from 'fmg-core';

import { GE_STAGES } from '../constants';
import * as ApplicationStatesA from './application-states/PlayerA';
import * as ApplicationStatesB from './application-states/PlayerB';
import Message from './Message';
import ChannelWallet from './ChannelWallet';
import decodePledge from './pledges/decode';
import { calculateResult, Result, Play }  from './pledges';
import PreFundSetup from './pledges/PreFundSetup';
import PostFundSetup from './pledges/PostFundSetup';
import Reveal from './pledges/Reveal';
import Propose from './pledges/Propose';
import Accept from './pledges/Accept';
import Resting from './pledges/Resting';
import Conclude from './pledges/Conclude';

export default class GameEngine {
  gameLibraryAddress: string;
  channelWallet: ChannelWallet;
  state: any;

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

  setupGame(myAddr: string, opponentAddr: string, stake: number, balances: number[]) {
    const participants = [myAddr, opponentAddr];
    const channel = new Channel(`0x${'0'.repeat(61)}123`, 456, participants);

    const nextPledge = new PreFundSetup(channel, 0, balances, 0, stake);
    const message = this.channelWallet.sign(nextPledge.toHex());

    const appState = new ApplicationStatesA.ReadyToSendPreFundSetupA({
      channel,
      stake,
      balances,
      message,
    });

    return appState;
  }

  prefundProposalReceived(opponentMessage: Message) {
    const opponentPledge = decodePledge(opponentMessage.state) as PreFundSetup;

    const { channel, stake, resolution: balances, turnNum, stateCount } = opponentPledge;

    const nextPledge = new PreFundSetup(channel, turnNum + 1, balances, stateCount + 1, stake);

    const message = this.channelWallet.sign(nextPledge.toHex());

    const appState = new ApplicationStatesB.ReadyToSendPreFundSetupB({
      channel,
      balances,
      stake,
      message,
    });

    return appState;
  }

  messageSent({ oldState }) {
    let newState;
    const { channel, balances, type: stateType, turnNum } = oldState;

    if (stateType === ApplicationStatesA.types.ReadyToSendPreFundSetupA) {
      newState = new ApplicationStatesA.WaitForPreFundSetupB({
        ...oldState.commonAttributes,
        message: oldState.message,
      });
    } else if (stateType === ApplicationStatesA.types.ReadyToSendPostFundSetupA) {
      newState = new ApplicationStatesA.WaitForPostFundSetupB({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        message: oldState.message,
      });
    } else if (stateType === ApplicationStatesA.types.ReadyToSendPropose) {
      newState = new ApplicationStatesA.WaitForAccept({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        aPlay: oldState.aPlay,
        salt: oldState.salt,
        message: oldState.message,
      });
    } else if (stateType === ApplicationStatesB.types.ReadyToSendPreFundSetupB) {
      newState = new ApplicationStatesB.WaitForAToDeploy({
        ...oldState.commonAttributes,
      });
    } else if (stateType === ApplicationStatesB.types.ReadyToSendPostFundSetupB) {
      const stateCount = oldState.stateCount + 1;
      const stake = oldState.stake;
      const postFundSetupB = new PostFundSetup(channel, turnNum + 1, balances, stateCount, stake);
      const message = this.channelWallet.sign(postFundSetupB.toHex());
      newState = new ApplicationStatesB.WaitForPropose({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        message,
      });
    } else if (stateType === ApplicationStatesB.types.ReadyToSendAccept) {
      newState = new ApplicationStatesB.WaitForReveal({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        bPlay: oldState.bPlay,
        message: oldState.message,
      });
    }

    return newState;
  }

  receiveMessage({ oldState, message }) {
    let newState;
    const opponentState = decodePledge(message.state);
    const { channel, type: stateType } = oldState;
    const { resolution: balances, turnNum } = opponentState;

    if (stateType === ApplicationStatesA.types.WaitForPreFundSetupB) {
      newState = new ApplicationStatesA.ReadyToDeploy({
        ...oldState.commonAttributes,
        transaction: 'the gameEngine needs to construct this',
      });
    } else if (stateType === ApplicationStatesA.types.WaitForPostFundSetupB) {
      newState = new ApplicationStatesA.ReadyToChooseAPlay({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        turnNum,
      });
    } else if (stateType === ApplicationStatesA.types.WaitForAccept) {
      const { aPlay, salt, stake} = oldState;
      const bPlay = opponentState.bPlay;
      const result = calculateResult(aPlay, bPlay);

      // The opponent's state assumes that B won
      const newBalances = [...balances];
      if (result === Result.Tie) {
        newBalances[0] += stake;
        newBalances[1] -= stake;
      } else if (result === Result.AWon) {
        newBalances[0] += 2 * stake;
        newBalances[1] -= 2 * stake;
      }

      const nextPledge = new Reveal(channel, turnNum + 1, newBalances, stake, bPlay, aPlay, salt);

      const revealMessage = this.channelWallet.sign(nextPledge.toHex());

      newState = new ApplicationStatesA.ReadyToSendReveal({
        channel,
        stake,
        balances,
        adjudicator: oldState.adjudicator,
        aPlay,
        bPlay,
        result,
        salt,
        message: revealMessage,
      });
    } else if (stateType === ApplicationStatesA.types.ReadyToSendReveal) {
      newState = new ApplicationStatesA.ReadyToChooseAPlay({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        turnNum,
      });
    } else if (stateType === ApplicationStatesB.types.WaitForPostFundSetupA) {
      const gameState = new PostFundSetup(
        opponentState.channel,
        3, // turnNum
        opponentState.resolution,
        1, // stateCount
        opponentState.stake
      );
      const response = this.channelWallet.sign(gameState.toHex());
      newState = new ApplicationStatesB.ReadyToSendPostFundSetupB({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        message: response,
      });
    } else if (stateType === ApplicationStatesB.types.WaitForPropose) {
      newState = new ApplicationStatesB.ReadyToChooseBPlay({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        turnNum: opponentState.turnNum,
        preCommit: opponentState.preCommit,
      });
    } else if (stateType === ApplicationStatesB.types.WaitForReveal) {
      const response = new Resting(
        opponentState.channel,
        opponentState.turnNum + 1,
        opponentState.resolution,
        opponentState.stake
      );
      newState = new ApplicationStatesB.ReadyToSendResting({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        aPlay: opponentState.aPlay,
        bPlay: oldState.bPlay,
        result: opponentState.result,
        salt: opponentState.salt,
        balances: opponentState.resolution,
        message: this.channelWallet.sign(response.toHex()),
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
      newState = new ApplicationStatesB.WaitForPostFundSetupA({
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
      const postFundSetup = new PostFundSetup(
        oldState.channel,
        2, // turnNum
        oldState.balances,
        0, // stateCount
        oldState.stake
      );

      const message = this.channelWallet.sign(postFundSetup.toHex());
      newState = new ApplicationStatesA.ReadyToSendPostFundSetupA({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        message,
      });
    } else if (stateType === ApplicationStatesB.types.WaitForAToDeploy) {
      newState = new ApplicationStatesB.ReadyToDeposit({
        ...oldState.commonAttributes,
        adjudicator: event.adjudicator,
        transaction: 'the gameEngine needs to construct this',
      });
    }

    return newState;
  }

  choosePlay(oldState, move: Play) {
    let message;
    let newState;
    const { balances, turnNum, stake, channel } = oldState;

    if (oldState.type === ApplicationStatesA.types.ReadyToChooseAPlay) {
      const aPlay = move;
      const salt = 'salt';

      const nextPledge = Propose.createWithPlayAndSalt(
        channel,
        turnNum + 1,
        balances,
        stake,
        aPlay,
        salt
      );

      message = this.channelWallet.sign(nextPledge.toHex());

      newState = new ApplicationStatesA.ReadyToSendPropose({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        aPlay,
        salt,
        message,
      });
    } else if (oldState.type === ApplicationStatesB.types.ReadyToChooseBPlay) {
      const bPlay = move;
      const preCommit = oldState.preCommit;

      const newBalances = [...balances];
      newBalances[0] -= stake;
      newBalances[1] += stake;

      const acceptPledge = new Accept(channel, turnNum + 1, newBalances, stake, preCommit, bPlay);

      message = this.channelWallet.sign(acceptPledge.toHex());

      newState = new ApplicationStatesB.ReadyToSendAccept({
        channel,
        stake,
        balances: newBalances,
        adjudicator: oldState.adjudicator,
        bPlay,
        message,
      });
    }
    return newState;
  }

  conclude({ oldState }) {
    const { message } = oldState;
    const oldPledge = decodePledge(message.state);
    let newState;

    const concludePledge = new Conclude(
      oldState.channel,
      oldPledge.turnNum + 1,
      oldState.balances
    );

    const concludeMessage = this.channelWallet.sign(concludePledge.toHex());

    if (oldPledge.turnNum % 2 === 0) {
      newState = new ApplicationStatesA.ReadyToSendConcludeA({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        message: concludeMessage,
      });
    } else if (oldPledge.turnNum % 2 === 1) {
      newState = new ApplicationStatesB.ReadyToSendConcludeB({
        ...oldState.commonAttributes,
        adjudicator: oldState.adjudicator,
        message: concludeMessage,
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
