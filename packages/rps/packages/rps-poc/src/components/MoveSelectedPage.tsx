import React from 'react';

import { Move } from '../core';
import { MoveBadge } from './MoveBadge';
import Button from 'reactstrap/lib/Button';
import { GameLayout } from './GameLayout';

interface Props {
  message: string;
  yourMove: Move;
  createBlockchainChallenge: ()=>void;
}

export default class MoveSelectedPage extends React.PureComponent<Props> {
  static defaultProps = {
    selectedMoveId: null,
  };

  render() {
    const { message, yourMove, createBlockchainChallenge } = this.props;

    return (
      <GameLayout>
        <div className="w-100 text-center mb-5">
          <h1 className="mb-5">Move chosen!</h1>
          <p className="lead">
            You chose <strong>{Move[yourMove]}</strong>
          </p>

          <div className="mb-5">
            <MoveBadge move={yourMove} />`
          </div>
          <Button onClick={createBlockchainChallenge}>Challenge</Button>
          <p>{message}</p>
        </div>
      </GameLayout>
    );
  }
}
