import React, { PureComponent } from 'react';

import OpponentSelectionStep from './OpponentSelectionStep';
import WaitingStep from './WaitingStep';
import SelectPlayStep from './SelectPlayStep';
import * as playerA from '../game-engine/application-states/PlayerA';
import * as playerB from '../game-engine/application-states/PlayerB';
import { GameState } from '../redux/reducers/game';
import { Opponent } from '../redux/reducers/opponents';

import { Play } from '../game-engine/positions/index';

interface Props {
  applicationState: GameState;
  choosePlay: (play: Play) => void; // TODO: what should this be?
  chooseOpponent: (opponentAddress: string, stake: number) => void;
  opponents: Opponent[];
  subscribeOpponents: () => void;
  playComputer: (stake: number) => void;
}

export default class GameController extends PureComponent<Props> {
  render() {
    const {
      applicationState,
      choosePlay,
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
      case playerA.ReadyToSendPreFundSetupA:
        return <WaitingStep message="ready to propose game" />;

      case playerA.WaitForPreFundSetupB:
        return <WaitingStep message="opponent to accept game" />;

      case playerA.ReadyToDeploy:
        return <WaitingStep message="ready to deploy adjudicator" />;

      case playerA.WaitForBlockchainDeploy:
        return <WaitingStep message="confirmation of adjudicator deployment" />;

      case playerA.WaitForBToDeposit:
        return <WaitingStep message="confirmation of opponent's deposit" />;

      case playerA.ReadyToSendPostFundSetupA:
        return <WaitingStep message="ready to send deposit confirmation" />;

      case playerA.WaitForPostFundSetupB:
        return <WaitingStep message="opponent to confirm deposits" />;

      case playerA.ReadyToChooseAPlay:
        return <SelectPlayStep choosePlay={choosePlay} />;

      case playerA.ReadyToSendPropose:
        // choice made
        return <WaitingStep message="ready to send round proposal" />;

      case playerA.WaitForAccept:
        // choice made
        return <WaitingStep message="opponent to choose their move" />;

      case playerA.ReadyToSendReveal:
        // result
        return <WaitingStep message="ready to send reveal" />;

      case playerA.WaitForResting:
        // result 
        return <WaitingStep message="resting" />;
      
      case playerB.ReadyToSendPreFundSetupB:
        return <WaitingStep message="ready to send prefund setup" />;

      case playerB.WaitForAToDeploy:
        return <WaitingStep message="waiting for adjudicator to be deployed" />;

      case playerB.ReadyToDeposit:
        return <WaitingStep message="ready to deposit funds" />;

      case playerB.WaitForBlockchainDeposit:
        return <WaitingStep message="waiting for deposit confirmation" />;

      case playerB.WaitForPostFundSetupA:
        return <WaitingStep message="waiting for post fund setup" />;

      case playerB.ReadyToSendPostFundSetupB:
        return <WaitingStep message="ready to send post fund setup" />;

      case playerB.ReadyToChooseBPlay:
        return <SelectPlayStep choosePlay={choosePlay} />;

      case playerB.ReadyToSendAccept:
        // your choice
        return <WaitingStep message="ready to send accept" />;

      case playerB.WaitForReveal:
        // choice made
        return <WaitingStep message="opponent to reveal their move" />;

      case playerB.ReadyToSendResting:
        // result
        return <WaitingStep message="opponent to accept the outcome" />;

      default:
      return <WaitingStep message={`[view not implemented: ${applicationState.constructor.name}`} />;
    }
  }
}
