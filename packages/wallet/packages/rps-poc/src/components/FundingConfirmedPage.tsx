import React from 'react';
import { GameLayout } from './GameLayout';

interface Props {
  message: string;
}

export default class FundingConfirmedPage extends React.PureComponent<Props> {
  render() {
    const { message } = this.props;

    return (
      <GameLayout>
        <div className="w-100 text-center mb-5">
          <h1 className="mb-5">Funding Confirmed!</h1>
          <p className="lead">{message}</p>
        </div>
      </GameLayout>
    );
  }
}
