import React from 'react';

import { Button } from 'reactstrap';

import web3Utils from 'web3-utils';
import { ApplicationLayout } from './ApplicationLayout';

interface Props {
  cancelOpenGame: () => void;
  roundBuyIn: string;
}

export default class WaitingRoomPage extends React.PureComponent<Props> {
  render() {
    const { cancelOpenGame, roundBuyIn } = this.props;
    return (
      <ApplicationLayout>
        <div className="waiting-room-container">
          <h2 className="w-100 text-center">
            Waiting for someone to join your game for {web3Utils.fromWei(roundBuyIn, 'ether')} ETH.
        </h2>
          <Button className="cancel-challenge-button" onClick={cancelOpenGame}>
            Cancel
        </Button>
        </div>
      </ApplicationLayout>
    );
  }
}
