import _ from 'lodash';
import React from 'react';

import { Button, Modal, ModalBody } from 'reactstrap';

interface Props {
  // withdraw: () => void;
  visible: boolean;
  exitToLobby: () => void;
}

export default class GameOverPage extends React.PureComponent<Props> {

  render() {
    return (
      <Modal className="game-over-container" isOpen={this.props.visible} centered={true}>

        <ModalBody>

          <div className="game-over-content">
            <span className="game-over-message">The Game is over!</span>
            {/* <div>You must withdraw your funds to exit the game.</div> */}
            <Button className="game-over-button" onClick={this.props.exitToLobby} block={false}>
              Back To Lobby
          </Button>
          </div>
        </ModalBody>
      </Modal>
    );
  }
}
