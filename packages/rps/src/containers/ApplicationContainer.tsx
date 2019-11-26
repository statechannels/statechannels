import React from 'react';
import { connect } from 'react-redux';

import { SiteState } from '../redux/reducer';
import GameContainer from './GameContainer';
import LobbyContainer from './LobbyContainer';
import * as gameStates from '../redux/game-v2/state';

interface ApplicationProps {
  gameState: gameStates.GameState;
}

function Application(props: ApplicationProps) {
  switch (props.gameState.localState.type) {
    // lobby is special as we need access to the list of open challenges
    case 'Lobby':
      return <LobbyContainer />;
    default:
      return <GameContainer />;
  }
}

const mapStateToProps = (state: SiteState): ApplicationProps => ({
  gameState: state.game,
});

export default connect(mapStateToProps)(Application);
