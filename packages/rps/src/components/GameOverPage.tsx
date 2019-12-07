import _ from 'lodash';
import React from 'react';

import {Button, Modal, ModalBody} from 'reactstrap';

interface Props {
  exitToLobby: () => void;
  visible: boolean;
}

export default class GameOverPage extends React.PureComponent<Props> {
  render() {
    return (
      <Modal className="game-over-container" isOpen={this.props.visible} centered={true}>
        <ModalBody>
          <div className="game-over-content">
            <h1>The Game is over!</h1>
            <Button className="game-over-button" onClick={this.props.exitToLobby}>
              Exit
            </Button>
          </div>
        </ModalBody>
      </Modal>
    );
  }
}
