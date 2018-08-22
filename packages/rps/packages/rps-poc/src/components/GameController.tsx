import React, { PureComponent } from 'react';

import OpponentSelectionStep from './OpponentSelectionStep';
import WaitingStep from './WaitingStep';
import SelectPlayPage from './SelectPlayPage';
import ProposeGamePage from './ProposeGamePage';
import ProposalSentPage from './ProposalSentPage';
import FundingConfirmedPage from './FundingConfirmedPage';
import PlaySelectedPage from './PlaySelectedPage';
import ResultPage from './ResultPage';
import * as playerA from '../game-engine/application-states/PlayerA';
import * as playerB from '../game-engine/application-states/PlayerB';
import { GameState } from '../redux/reducers/game';
import { Opponent } from '../redux/reducers/opponents';

import { Play } from '../game-engine/positions';

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
        return <ProposeGamePage message="ready to propose game" />;

      case playerA.WaitForPreFundSetupB:
        return <ProposalSentPage message="Waiting for opponent to accept game" />;

      case playerA.ReadyToDeploy:
        return <WaitingStep message="ready to deploy adjudicator" />;

      case playerA.WaitForBlockchainDeploy:
        return <WaitingStep message="confirmation of adjudicator deployment" />;

      case playerA.WaitForBToDeposit:
        return <WaitingStep message="confirmation of opponent's deposit" />;

      case playerA.ReadyToSendPostFundSetupA:
        return <FundingConfirmedPage message="sending acknowledgement to opponent" />;

      case playerA.WaitForPostFundSetupB:
        return <FundingConfirmedPage message="waiting for opponent to acknowledge" />;

      case playerA.ReadyToChooseAPlay:
        return <SelectPlayPage choosePlay={choosePlay} />;

      case playerA.ReadyToSendPropose:
        const state2 = applicationState as playerA.ReadyToSendPropose;
        return <PlaySelectedPage message="ready to send round proposal"
                                 yourPlay={state2.aPlay} />;

      case playerA.WaitForAccept:
        const state3 = applicationState as playerA.ReadyToSendPropose;
        return <PlaySelectedPage message="wait for opponent to accept"
                                 yourPlay={state3.aPlay} />;

      case playerA.ReadyToSendReveal:
        const state0 = applicationState as playerA.ReadyToSendReveal;
        return <ResultPage message="resting"
                           yourPlay={state0.aPlay}
                           theirPlay={state0.bPlay}
                           result={state0.result} />;

      case playerA.WaitForResting:
        const state1 = applicationState as playerA.WaitForResting;
        return <ResultPage message="resting"
                           yourPlay={state1.aPlay}
                           theirPlay={state1.bPlay}
                           result={state1.result} />;
      
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
        return <SelectPlayPage choosePlay={choosePlay} />;

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
