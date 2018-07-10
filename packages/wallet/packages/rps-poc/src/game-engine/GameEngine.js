import { GE_STAGES, GE_COMMANDS } from '../constants';
import * as ApplicationStatesA from './application-states/ApplicationStatesPlayerA';
import * as ApplicationStatesB from './application-states/ApplicationStatesPlayerB';
import { Message } from './message';
import { RpsGame, RpsState } from '../game-rules/game-rules';
import { Channel } from 'fmg-core';
import { Signature } from './Signature';

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

    return new ApplicationStatesA.ReadyToSendPreFundSetup0({
      channel,
      stake,
      balances: initialBals,
      signedPreFundSetup0Message: message.toHex()
    })
  }

  preFundProposalSent() {
    return new ApplicationStatesA.WaitForPreFundSetup1({
      channel: this.state.channel,
      stake: this.state.stake,
      balances: this.state.balances,
      signedPreFundSetup0Message: 'TODO: replace me'
    })
  }

  prefundProposalReceived(proposal) {
    let channel = proposal.channel;
    let stake = proposal.stake;
    let balances = proposal.balances;

    return new ApplicationStatesB.ReadyToSendPreFundSetup1({
      channel,
      stake,
      balances,
      signedPreFundSetup1Message: 'TODO: replace me'
    })
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


