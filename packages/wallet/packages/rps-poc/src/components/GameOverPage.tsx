import _ from 'lodash';
import React from 'react';

import { Button, Modal, ModalBody } from 'reactstrap';

interface Props {
  withdraw: () => void;
  visible: boolean;
}

export default class GameOverPage extends React.PureComponent<Props> {

  render() {
    return (
      <Modal className="game-over-container" isOpen={this.props.visible} centered={true}>

        <ModalBody>

          <div className="game-over-content">
            <h1>The Game is over!</h1>
            <div>You must withdraw your funds to exit the game.</div>
            <Button className="game-over-button" onClick={this.props.withdraw} block={true}>
              Withdraw Funds Now
          </Button>
          </div>
        </ModalBody>
      </Modal>
    );
  }
}
