import React, {Fragment} from 'react';
import {connect} from 'react-redux';

import {SiteState} from '../redux/reducer';
import {Weapon, ChannelState} from '../core';
import * as gameActions from '../redux/game/actions';

import WaitingRoomPage from '../components/WaitingRoomPage';
import ProfileContainer from './ProfileContainer';

import {LocalState, PlayingStateName} from '../redux/game/state';

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
  const {localState} = props;

  switch (localState.type) {
    case 'Empty':
      return <ProfileContainer />;
    case 'NeedAddress':
    case 'Lobby':
    case 'CreatingOpenGame':
      return <LobbyContainer />;
    case 'WaitingRoom':
      return (
        <WaitingRoomPage
          cancelOpenGame={props.cancelOpenGame}
          roundBuyIn={localState.roundBuyIn.toString()}
        />
      );
    case 'GameChosen':
      return <ProposeGamePage message="Waiting for opponent to confirm" />;
    case 'OpponentJoined':
      return (
        <ConfirmGamePage
          stake={localState.roundBuyIn.toString()}
          opponentName={localState.opponentName}
        />
      );
    case 'ChooseWeapon':
      return <SelectWeaponPage chooseWeapon={props.chooseWeapon} />;
    case 'WeaponChosen':
    case 'WeaponAndSaltChosen':
      return (
        <WeaponSelectedPage
          message="Waiting for your opponent to choose their move"
          yourWeapon={localState.myWeapon}
        />
      );
    case 'ResultPlayAgain':
      return (
        <WaitForResting
          yourWeapon={localState.myWeapon}
          theirWeapon={localState.theirWeapon}
          result={localState.result}
          playAgain={props.playAgain}
          waitForOpponent={false}
        />
      );
    case 'WaitForRestart':
      return (
        <WaitForResting
          yourWeapon={localState.myWeapon}
          theirWeapon={localState.theirWeapon}
          result={localState.result}
          playAgain={props.playAgain}
          waitForOpponent={true}
        />
      );
    case 'InsufficientFunds':
      return (
        <InsufficientFunds
          yourWeapon={localState.myWeapon}
          theirWeapon={localState.theirWeapon}
          result={localState.result}
          action={props.gameOver}
        />
      );
    case 'Resigned':
      return <Resigned iResigned={localState.iResigned} action={props.gameOver} />;
    case 'GameOver':
      return (
        <GameOverPage
          visible={(localState.type as PlayingStateName) === 'GameOver'}
          exitToLobby={props.exitToLobby}
        />
      );
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
