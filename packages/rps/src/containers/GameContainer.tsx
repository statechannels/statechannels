import React, { Fragment } from 'react';
import { connect } from 'react-redux';

import { Weapon } from '../core';
import { SiteState } from '../redux/reducer';
import * as gameActions from '../redux/game/actions';

import WaitingRoomPage from '../components/WaitingRoomPage';
import ProfileContainer from './ProfileContainer';

import { LocalState } from '../redux/game-v2/state';

interface GameProps {
  state: LocalState;
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
  const { state } = props;

  switch (state.type) {
    case 'Empty':
      return <ProfileContainer />;
    case 'WaitingRoom':
      return (
        <WaitingRoomPage
          cancelOpenGame={props.cancelOpenGame}
          roundBuyIn={state.roundBuyIn.toString()}
        />
      );

    default:
      throw new Error(`View not created for ${state.name}`);
  }
}

const mapStateToProps = (state: SiteState) => ({
  state: state.game.localState,
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

export default connect(mapStateToProps, mapDispatchToProps)(GameContainer);
