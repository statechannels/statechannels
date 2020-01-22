import React, {Fragment} from 'react';
import {connect} from 'react-redux';

import {SiteState} from '../redux/reducer';
import {Weapon, ChannelState, isClosed} from '../core';
import * as gameActions from '../redux/game/actions';

import WaitingRoomPage from '../components/WaitingRoomPage';
import ProfileContainer from './ProfileContainer';

import {LocalState} from '../redux/game/state';

import LobbyContainer from './LobbyContainer';
import {
  ProposeGamePage,
  ConfirmGamePage,
  SelectWeaponPage,
  WeaponSelectedPage,
  WaitForResting,
  InsufficientFunds,
  GameOverPage,
  Resigned,
} from '../components';
import {unreachable} from '../utils/unreachable';

interface GameProps {
  localState: LocalState;
  channelState: ChannelState;
  chooseWeapon: (move: Weapon) => void;
  playAgain: () => void;
  cancelOpenGame: () => void;
  gameOver: () => void;
  exitToLobby: () => void;
}

function GameContainer(props: GameProps) {
  return <Fragment>{RenderGame(props)}</Fragment>;
}

function RenderGame(props: GameProps) {
  const {localState, channelState} = props;

  switch (localState.type) {
    case 'Setup.Empty':
      return <ProfileContainer />;
    case 'Setup.NeedAddress':
    case 'Setup.Lobby':
    case 'B.CreatingOpenGame':
      return <LobbyContainer />;
    case 'B.WaitingRoom':
      return (
        <WaitingRoomPage
          cancelOpenGame={props.cancelOpenGame}
          roundBuyIn={localState.roundBuyIn.toString()}
        />
      );
    case 'A.GameChosen':
      return <ProposeGamePage message="Waiting for opponent to confirm" />;
    case 'B.OpponentJoined':
      return (
        <ConfirmGamePage
          stake={localState.roundBuyIn.toString()}
          opponentName={localState.opponentName}
        />
      );
    case 'A.ChooseWeapon':
    case 'B.ChooseWeapon':
      return (
        <SelectWeaponPage
          chooseWeapon={props.chooseWeapon}
          challengeExpirationDate={channelState.challengeExpirationTime}
        />
      );
    case 'A.WeaponChosen':
    case 'A.WeaponAndSaltChosen':
    case 'B.WeaponChosen':
      return (
        <WeaponSelectedPage
          message="Waiting for your opponent to choose their move"
          yourWeapon={localState.myWeapon}
        />
      );
    case 'A.ResultPlayAgain':
    case 'B.ResultPlayAgain':
      return (
        <WaitForResting
          yourWeapon={localState.myWeapon}
          theirWeapon={localState.theirWeapon}
          result={localState.result}
          playAgain={props.playAgain}
          waitForOpponent={false}
        />
      );
    case 'A.WaitForRestart':
    case 'B.WaitForRestart':
      return (
        <WaitForResting
          yourWeapon={localState.myWeapon}
          theirWeapon={localState.theirWeapon}
          result={localState.result}
          playAgain={props.playAgain}
          waitForOpponent={true}
        />
      );
    case 'A.Resigned':
    case 'B.Resigned':
      return (
        <Resigned
          iResigned={localState.iResigned}
          action={props.gameOver}
          channelClosed={isClosed(channelState)}
        />
      );
    case 'A.InsufficientFunds':
    case 'B.InsufficientFunds':
      return (
        <InsufficientFunds
          yourWeapon={localState.myWeapon}
          theirWeapon={localState.theirWeapon}
          result={localState.result}
          action={props.gameOver}
        />
      );
    case 'EndGame.GameOver':
      return <GameOverPage visible={true} exitToLobby={props.exitToLobby} />;
    default:
      unreachable(localState);
      throw new Error(`View not created`);
  }
}

const mapStateToProps = (siteState: SiteState) => ({
  localState: siteState.game.localState,
  channelState: siteState.game.channelState,
});

const mapDispatchToProps = {
  chooseWeapon: gameActions.chooseWeapon,
  playAgain: gameActions.playAgain,
  cancelOpenGame: gameActions.cancelGame,
  gameOver: gameActions.gameOver,
  exitToLobby: gameActions.exitToLobby,
};

export default connect(mapStateToProps, mapDispatchToProps)(GameContainer);
