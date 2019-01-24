import React from 'react';
import { GameLayout } from './GameLayout';

interface Props {
  reason: string;
}

export default class WaitForWallet extends React.PureComponent<Props> {
  render() {
    const { reason } = this.props;
    return (
      <GameLayout>
        <div className="container centered-container">
          <div className="w-100 text-center mb-5">
            <h1 className="mb-5">
              Action required from your wallet:
          </h1>
            <p className="lead">{reason}</p>
          </div>
        </div>
      </GameLayout>
    );
  }
}