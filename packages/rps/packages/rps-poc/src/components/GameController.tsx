import React, { PureComponent } from 'react';

import OpponentSelectionStep from './OpponentSelectionStep';
import WaitingStep from './WaitingStep';
import SelectPlayPage from './SelectPlayPage';
import GameProposedPage from './GameProposedPage';
import FundingConfirmedPage from './FundingConfirmedPage';
import PlaySelectedPage from './PlaySelectedPage';
import ResultPage from './ResultPage';
import { PlayerAStateType as playerA } from '../game-engine/application-states/PlayerA';
import { PlayerBStateType as playerB } from '../game-engine/application-states/PlayerB';
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

    switch (applicationState.type) {
      case playerA.WAIT_FOR_PRE_FUND_SETUP:
        return <GameProposedPage message="Waiting for opponent to accept game" />;

      case playerA.WAIT_FOR_FUNDING:
        return <WalletController />;

      case playerA.WAIT_FOR_POST_FUND_SETUP:
        return <FundingConfirmedPage message="Waiting for opponent to acknowledge" />;

      case playerA.CHOOSE_PLAY:
        return <SelectPlayPage choosePlay={choosePlay} />;

      case playerA.WAIT_FOR_ACCEPT:
        return (
          <PlaySelectedPage message="Waiting for opponent to accept" yourPlay={applicationState.aPlay} />
        );

      case playerA.WAIT_FOR_RESTING:
        return (
          <ResultPage
            message="Waiting for resting"
            yourPlay={applicationState.aPlay}
            theirPlay={applicationState.bPlay}
            result={applicationState.result}
          />
        );

      case playerA.INSUFFICIENT_FUNDS:
        // todo: add into the logic about who it was that ran out of funds
        return <WaitingStep message="About to conclude the game – either you or your opponent has run out of funds!" />;

      case playerB.WAIT_FOR_FUNDING:
        return <WalletController />;

      case playerB.WAIT_FOR_POST_FUND_SETUP:
        return <WaitingStep message="Waiting for post-fund setup" />;

      case playerB.CHOOSE_PLAY:
        return <SelectPlayPage choosePlay={choosePlay} />;

      case playerB.WAIT_FOR_REVEAL:
        // choice made
        return <WaitingStep message="Waiting for opponent to reveal their move" />;

      default:
        return (
          <WaitingStep message={`[view not implemented: ${applicationState.type}`} />
        );
    }
  }
}
