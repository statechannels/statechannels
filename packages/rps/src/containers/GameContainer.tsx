import React, {Fragment} from 'react';
import {connect} from 'react-redux';

import {Weapon, Player} from '../core';
import {SiteState} from '../redux/reducer';
import * as gameActions from '../redux/game/actions';

import WaitingRoomPage from '../components/WaitingRoomPage';
import ConfirmGamePage from '../components/ConfirmGamePage';
import SelectWeaponPage from '../components/SelectWeaponPage';
import WaitForOpponentToPickWeapon from '../components/WaitForOpponentToPickWeapon';
import WeaponSelectedPage from '../components/WeaponSelectedPage'; // WaitForReveal, WaitForResting
import PlayAgain from '../components/PlayAgain';
import WaitForRestingA from '../components/WaitForRestingA';
import WaitForResignationAcknowledgement from '../components/WaitForResignationAcknowledgement';
import GameOverPage from '../components/GameOverPage'; // GameOver, OpponentResigned
import GameProposedPage from '../components/GameProposedPage';
import ProfileContainer from './ProfileContainer';

import WaitForWallet from '../components/WaitForWallet'; // WaitForFunding, maybe others?

import {GameState, StateName, PlayingState} from '../redux/game/state';

interface GameProps {
  state: GameState;
  chooseWeapon: (move: Weapon) => void;
  playAgain: () => void;
  confirmGame: () => void;
  declineGame: () => void;
  createOpenGame: (roundBuyIn: string) => void;
  cancelOpenGame: () => void;
  conclude: () => void;
}

// TODO: Add wallet from wallet package
function GameContainer(props: GameProps) {
  return <Fragment>{RenderGame(props)}</Fragment>;
}

function RenderGame(props: GameProps) {
  const {state, chooseWeapon, playAgain, confirmGame, declineGame, conclude} = props;
  const {player, turnNum} = state as PlayingState;
  const ourTurn = player === Player.PlayerA ? turnNum % 2 !== 0 : turnNum % 2 === 0;
  switch (state.name) {
    case StateName.NoName:
      return <ProfileContainer />;
    case StateName.WaitingRoom:
      return (
        <WaitingRoomPage cancelOpenGame={props.cancelOpenGame} roundBuyIn={state.roundBuyIn} />
      );

    case StateName.WaitForGameConfirmationA:
      return <GameProposedPage message="Waiting for opponent to confirm" />;
    case StateName.ConfirmGameB:
      return (
        <ConfirmGamePage
          confirmGame={confirmGame}
          cancelGame={declineGame}
          stake={state.roundBuyIn}
          opponentName={state.opponentName}
        />
      );
    case StateName.PickWeapon:
    case StateName.PickChallengeWeapon:
      return <SelectWeaponPage chooseWeapon={chooseWeapon} />;

    case StateName.WaitForOpponentToPickWeaponA:
      return (
        <WeaponSelectedPage
          message="Waiting for your opponent to choose their move"
          yourWeapon={state.myWeapon}
        />
      );

    case StateName.GameOver:
    // TODO: We probably want a seperate message for when your opponent resigns
    case StateName.OpponentResigned:
      return (
        <GameOverPage
          visible={state.name === StateName.OpponentResigned || state.name === StateName.GameOver}
          conclude={conclude}
          ourTurn={ourTurn}
        />
      );
    case StateName.WaitForOpponentToPickWeaponB:
      return <WaitForOpponentToPickWeapon />;

    case StateName.WaitForRevealB:
      return (
        <WeaponSelectedPage
          message="Waiting for your opponent to choose their move"
          yourWeapon={state.myWeapon}
        />
      );

    case StateName.PlayAgain:
    case StateName.ChallengePlayAgain:
      return (
        <PlayAgain
          yourWeapon={state.myWeapon}
          theirWeapon={state.theirWeapon}
          result={state.result}
          playAgain={playAgain}
        />
      );

    case StateName.WaitForRestingA:
      return (
        <WaitForRestingA
          yourWeapon={state.myWeapon}
          theirWeapon={state.theirWeapon}
          result={state.result}
          playAgain={playAgain}
        />
      );
    case StateName.WaitForResignationAcknowledgement:
      return <WaitForResignationAcknowledgement />;
    case StateName.WaitForFunding:
      return <WaitForWallet reason={'Waiting for funding confirmation.'} />;
    case StateName.WaitForWithdrawal:
      return <WaitForWallet reason={'Waiting for funds withdrawal.'} />;
    default:
      throw new Error(`View not created for ${state.name}`);
  }
}

const mapStateToProps = (state: SiteState) => ({
  state: state.game.gameState,
});

const mapDispatchToProps = {
  chooseWeapon: gameActions.chooseWeapon,
  playAgain: gameActions.playAgain,
  confirmGame: gameActions.confirmGame,
  declineGame: gameActions.declineGame,
  createOpenGame: gameActions.createOpenGame,
  cancelOpenGame: gameActions.cancelOpenGame,
  conclude: gameActions.resign,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(GameContainer);
