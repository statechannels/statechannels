import React from 'react';
import { connect } from 'react-redux';

import { SiteState } from '../redux/reducer';
import GameContainer from './GameContainer';
import WaitingRoomContainer from './WaitingRoomContainer';
import LobbyContainer from './LobbyContainer';
import { Room } from '../redux/application/reducer';

interface ApplicationProps {
  currentRoom: Room;
}

function Application(props: ApplicationProps) {
  switch (props.currentRoom) {
    case Room.waitingRoom:
      return <WaitingRoomContainer />;
    case Room.game:
      return <GameContainer />;
    default:
      return <LobbyContainer />;
  }
}

const mapStateToProps = (state: SiteState): ApplicationProps => ({
  currentRoom: state.app.currentRoom,
});

export default connect(mapStateToProps)(Application);
