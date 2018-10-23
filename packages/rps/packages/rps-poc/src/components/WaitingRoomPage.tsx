import React from 'react';

import { Button } from 'reactstrap';

import FooterBar from './FooterBar';
import web3Utils from 'web3-utils';
import BN from 'bn.js';

interface Props {
  cancelOpenGame: () => void;
  roundBuyIn: BN;
}

export default class WaitingRoomPage extends React.PureComponent<Props> {
  render() {
    const { cancelOpenGame, roundBuyIn } = this.props;
    return (
      <div className="container centered-container">
        <h2 className="w-100">
          Waiting for someone to accept your challenge for{' '}
          {web3Utils.fromWei(roundBuyIn.toString(), 'finney')} finney
        </h2>

        <Button block={true} onClick={cancelOpenGame}>
          Cancel
        </Button>
        <FooterBar>Waiting ...</FooterBar>
      </div>
    );
  }
}
