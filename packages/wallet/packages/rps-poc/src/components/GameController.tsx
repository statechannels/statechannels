import React, { PureComponent } from 'react';

import OpponentSelectionStep from './OpponentSelectionStep';
import WaitingStep from './WaitingStep';
import SelectPlayStep from './SelectPlayStep';
import * as playerAStates from '../game-engine/application-states/PlayerA';
import { GameState } from '../redux/reducers/game';
import { Opponent } from '../redux/reducers/opponents';

import { Play } from '../game-engine/positions/index';

interface Props {
  applicationState: GameState;
  chooseAPlay: (aPlay: Play) => void; // TODO: what should this be?
  chooseOpponent: (opponentAddress: string, stake: number) => void;
  opponents: Opponent[];
  subscribeOpponents: () => void;
  playComputer: (stake: number) => void;
}

export default class GameController extends PureComponent<Props> {
  render() {
    const {
      applicationState,
      chooseAPlay,
      chooseOpponent,
      opponents,
      subscribeOpponents,
      playComputer,
    } = this.props;

    if (applicationState === null) {
      subscribeOpponents();
      return (
        <OpponentSelectionStep
          chooseOpponent={chooseOpponent}
          playComputer={playComputer}
          opponents={opponents}
        />
      );
    }

    switch (applicationState && applicationState.constructor) {
      case playerAStates.ReadyToSendPreFundSetupA:
        return <WaitingStep message="ready to propose game" />;

      case playerAStates.WaitForPreFundSetupB:
        return <WaitingStep message="opponent to accept game" />;

      case playerAStates.ReadyToDeploy:
        return <WaitingStep message="ready to deploy adjudicator" />;

      case playerAStates.WaitForBlockchainDeploy:
        return <WaitingStep message="confirmation of adjudicator deployment" />;

      case playerAStates.WaitForBToDeposit:
        return <WaitingStep message="confirmation of opponent's deposit" />;

      case playerAStates.ReadyToSendPostFundSetupA:
        return <WaitingStep message="ready to send deposit confirmation" />;

      case playerAStates.WaitForPostFundSetupB:
        return <WaitingStep message="opponent to confirm deposits" />;

      case playerAStates.ReadyToChooseAPlay:
        return <SelectPlayStep chooseAPlay={chooseAPlay} />;

      case playerAStates.ReadyToSendPropose:
        return <WaitingStep message="ready to send round proposal" />;

      case playerAStates.WaitForAccept:
        return <WaitingStep message="opponent to choose their move" />;

      case playerAStates.ReadyToSendReveal:
        return <WaitingStep message="ready to send reveal" />;

      case playerAStates.WaitForResting:
        return <WaitingStep message="opponent to accept the outcome" />;

      default:
      return <WaitingStep message={`[view not implemented: ${applicationState.constructor.name}`} />;
    }
  }
}
