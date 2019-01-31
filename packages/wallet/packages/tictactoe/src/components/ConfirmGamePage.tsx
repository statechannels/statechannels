import React from 'react';

import { Button } from 'reactstrap';

import { ApplicationLayout } from './ApplicationLayout';
import web3Utils from 'web3-utils';
interface Props {
  confirmGame: () => void;
  cancelGame: () => void;
  stake: string;
  opponentName: string;
}

export default class ConfirmGamePage extends React.PureComponent<Props> {
  render() {

    const { confirmGame, cancelGame, stake, opponentName } = this.props;
    const gameBuyIn = String(Number(stake)*5);
    return (
      <ApplicationLayout>
        <div className="waiting-room-container">
          <h2 className="w-100 text-center waiting-room-title">Game Proposed!</h2>
          <div>
            <p className="lead waiting-room-title">{opponentName} has accepted your challenge with a {web3Utils.fromWei(gameBuyIn, 'ether')} ETH game buy in.</p>
            <p className="lead waiting-room-title">Do you want to play?</p>
            <div>
              <div className="cancel-challenge-button-container">
              <Button className="cancel-challenge-button" outline={true} onClick={confirmGame}>
                Play
              </Button>
              <Button className="cancel-challenge-button" outline={true} onClick={cancelGame}>
                Cancel
              </Button>
              </div>
            </div>
          </div>
        </div>
      </ApplicationLayout>
    );
  }
}
