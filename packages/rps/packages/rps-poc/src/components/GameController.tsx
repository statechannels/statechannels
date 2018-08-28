import React, { PureComponent } from 'react';

import OpponentSelectionStep from './OpponentSelectionStep';
import WaitingStep from './WaitingStep';
import SelectPlayPage from './SelectPlayPage';
import GameProposedPage from './GameProposedPage';
import FundingConfirmedPage from './FundingConfirmedPage';
import PlaySelectedPage from './PlaySelectedPage';
import ResultPage from './ResultPage';
import * as playerA from '../game-engine/application-states/PlayerA';
import * as playerB from '../game-engine/application-states/PlayerB';
import { GameState } from '../redux/reducers/game';
import { Opponent } from '../redux/reducers/opponents';

import { Play } from '../game-engine/positions';
import { WalletController } from '../wallet';

interface Props {
  applicationState: GameState;
  choosePlay: (play: Play) => void; // TODO: what should this be?
  chooseOpponent: (opponentAddress: string, stake: number) => void;
  opponents: Opponent[];
  subscribeOpponents: () => void;
  playComputer: (stake: number) => void;
  currentPlayer?: {
    address: string;
    name: string;
  };
  createChallenge: (challenge: any) => void;
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
      currentPlayer,
      createChallenge,
    } = this.props;

    if (applicationState === null) {
      subscribeOpponents();
      return (
        <OpponentSelectionStep
          chooseOpponent={chooseOpponent}
          playComputer={playComputer}
          opponents={opponents}
          currentPlayer={currentPlayer}
          createChallenge={createChallenge}
        />
      );
    }

    switch (applicationState && applicationState.constructor) {
      case playerA.ReadyToSendPreFundSetupA:
        return <GameProposedPage message="Waiting for opponent to accept game" />;

      case playerA.WaitForPreFundSetupB:
        return <GameProposedPage message="Waiting for opponent to accept game" />;

      case playerA.ReadyToFund:
        return <WaitingStep message="Ready to send funds" />;

      case playerA.WaitForFunding:
        return <WalletController />;

      case playerA.ReadyToSendPostFundSetupA:
        return <FundingConfirmedPage message="Sending acknowledgement to opponent" />;

      case playerA.WaitForPostFundSetupB:
        return <FundingConfirmedPage message="Waiting for opponent to acknowledge" />;

      case playerA.ReadyToChooseAPlay:
        return <SelectPlayPage choosePlay={choosePlay} />;

      case playerA.ReadyToSendPropose:
        const state2 = applicationState as playerA.ReadyToSendPropose;
        return <PlaySelectedPage message="Ready to send round proposal" yourPlay={state2.aPlay} />;

      case playerA.WaitForAccept:
        const state3 = applicationState as playerA.WaitForAccept;
        return (
          <PlaySelectedPage message="Waiting for opponent to accept" yourPlay={state3.aPlay} />
        );

      case playerA.ReadyToSendReveal:
        const state0 = applicationState as playerA.ReadyToSendReveal;
        return (
          <ResultPage
            message="Waiting for resting"
            yourPlay={state0.aPlay}
            theirPlay={state0.bPlay}
            result={state0.result}
          />
        );

      case playerA.WaitForResting:
        const state1 = applicationState as playerA.WaitForResting;
        return (
          <ResultPage
            message="Waiting for resting"
            yourPlay={state1.aPlay}
            theirPlay={state1.bPlay}
            result={state1.result}
          />
        );

      case playerA.InsufficientFundsA:
        return <WaitingStep message="About to conclude the game – you've run out of funds!" />;

      case playerA.InsufficientFundsB:
        return (
          <WaitingStep message="About to conclude the game – your opponent has run out of funds!" />
        );

      case playerB.ReadyToSendPreFundSetupB:
        return <WaitingStep message="Ready to send prefund setup" />;

      case playerB.ReadyToFund:
        return <WaitingStep message="Ready for funding" />;

      case playerB.WaitForFunding:
        return <WalletController />;
      case playerB.WaitForPostFundSetupA:
        return <WaitingStep message="Waiting for post-fund setup" />;

      case playerB.ReadyToSendPostFundSetupB:
        return <WaitingStep message="Ready to send post-fund setup" />;

      case playerB.ReadyToChooseBPlay:
        return <SelectPlayPage choosePlay={choosePlay} />;

      case playerB.ReadyToSendAccept:
        // your choice
        return <WaitingStep message="Ready to send accept" />;

      case playerB.WaitForReveal:
        // choice made
        return <WaitingStep message="Waiting for opponent to reveal their move" />;

      case playerB.ReadyToSendResting:
        // result
        return <WaitingStep message="Waiting for opponent to accept the outcome" />;

      default:
        return (
          <WaitingStep message={`[view not implemented: ${applicationState.constructor.name}`} />
        );
    }
  }
}
