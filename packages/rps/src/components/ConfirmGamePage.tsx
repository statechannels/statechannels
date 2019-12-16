import React from 'react';
import {ApplicationLayout} from './ApplicationLayout';
import {formatUnits} from 'ethers/utils';

interface Props {
  stake: string;
  opponentName: string;
}

export default class ConfirmGamePage extends React.PureComponent<Props> {
  render() {
    const {stake, opponentName} = this.props;
    return (
      <ApplicationLayout>
        <div className="w-100 text-center mb-5">
          <h1 className="w-100">Game Proposed!</h1>
          <div>
            <p>
              {opponentName} has accepted your challenge with a {formatUnits(stake, 'ether')} ETH
              buy in.
            </p>
            <p>Waiting for your wallet...</p>
          </div>
        </div>
      </ApplicationLayout>
    );
  }
}
