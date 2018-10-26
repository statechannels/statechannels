import React from 'react';

import { Button } from 'reactstrap';

import FooterBar from './FooterBar';
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
    return (
      <ApplicationLayout>
        <div className="w-100 text-center mb-5">
          <h1 className="w-100">Game Proposed!</h1>
          <div>
            <p>{opponentName} has accepted your challenge with a {web3Utils.fromWei(stake, 'ether')} ETH buy in.</p>
            <p>Do you want to play?</p>

            <div>
              <Button className="confirm-button" outline={true} onClick={confirmGame}>
                Play
          </Button>
              <Button className="confirm-button" outline={true} onClick={cancelGame}>
                Cancel
          </Button>
            </div>
          </div>
          <FooterBar>Waiting ...</FooterBar>
        </div>
      </ApplicationLayout>
    );
  }
}
