import React from 'react';

import { Button } from 'reactstrap';

import FooterBar from './FooterBar';
import BN from 'bn.js';
import ApplicationContainer from 'src/containers/ApplicationContainer';

interface Props {
  confirmGame: () => void;
  cancelGame: () => void;
  stake: BN;
  opponentName: string;
}

export default class ConfirmGamePage extends React.PureComponent<Props> {
  render() {
    // TODO: Cancelling and a better display 
    const { confirmGame, cancelGame } = this.props;
    return (
      <ApplicationContainer>
        <div className="container centered-container">
          <h2 className="w-100">
            Please confirm the game.
        </h2>

          <Button block={true} onClick={confirmGame}>
            Confirm
        </Button>
          <Button block={true} onClick={cancelGame}>
            Cancel
        </Button>
          <FooterBar>Waiting ...</FooterBar>
        </div>
      </ApplicationContainer>
    );
  }
}
