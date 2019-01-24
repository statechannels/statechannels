import React from 'react';
import { connect } from 'react-redux';

import { SiteState } from '../redux/reducer';
import GameContainer from './GameContainer';
import LobbyContainer from './LobbyContainer';
import * as gameStates from '../redux/game/state';

interface ApplicationProps {
  gameState: gameStates.GameState;
}

function Application(props: ApplicationProps) {
  switch (props.gameState.name) {
    // lobby is special as we need access to the list of open challenges
    case gameStates.StateName.Lobby:
    case gameStates.StateName.CreatingOpenGame:
      return (
        <LobbyContainer />
      );
    default:
      return <GameContainer />;
  }
}

const mapStateToProps = (state: SiteState): ApplicationProps => ({
  gameState: state.game.gameState,
});

export default connect(mapStateToProps)(Application);
