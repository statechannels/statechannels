import React from 'react';
import { connect } from 'react-redux';

import * as gameActions from '../redux/game/actions';

import WaitingStep from '../components/WaitingStep';
import SelectPlayPage from '../components/SelectPlayPage';
import GameProposedPage from '../components/GameProposedPage';
import FundingConfirmedPage from '../components/FundingConfirmedPage';
import PlaySelectedPage from '../components/PlaySelectedPage';
import ResultPage from '../components/ResultPage';

import { WalletController } from '../wallet';

import { SiteState } from '../redux/reducer';

import { PlayerAStateType as playerA } from '../game-engine/application-states/PlayerA';
import { PlayerBStateType as playerB } from '../game-engine/application-states/PlayerB';

import { State as GameState } from '../game-engine/application-states';
import { Play } from '../game-engine/positions';

interface GameProps {
  state: GameState,
  choosePlay: (play: Play) => void; // TODO: what should this be?
}

function GameContainer(props: GameProps) {
  const { state, choosePlay } = props;

  switch (state.type) {
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
        <PlaySelectedPage
          message="Waiting for opponent to accept"
          yourPlay={state.aPlay}
        />
      );

    case playerA.WAIT_FOR_RESTING:
      return (
        <ResultPage
          message="Waiting for resting"
          yourPlay={state.aPlay}
          theirPlay={state.bPlay}
          result={state.result}
        />
      );

    case playerA.INSUFFICIENT_FUNDS:
      // todo: add into the logic about who it was that ran out of funds
      // Also todo: replace with new component (WaitingStep is just a filler)
      return (
        <WaitingStep message="About to conclude the game – either you or your opponent has run out of funds!" />
      );

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
      return <WaitingStep message={`[view not implemented: ${state.type}`} />;
  }
}

const mapStateToProps = (state: SiteState) => ({
  state: state.app.gameState as GameState,
});

const mapDispatchToProps = {
  choosePlay: gameActions.choosePlay,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GameContainer);
