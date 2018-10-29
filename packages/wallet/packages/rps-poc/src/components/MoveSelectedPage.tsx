import React from 'react';

import { Move } from '../core';
import { MoveBadge } from './MoveBadge';
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
    const { message, yourMove } = this.props;

    return (
      <GameLayout>
        <div className="w-100 text-center">
          <h1>Move chosen!</h1>
          <p className="lead">
            You chose <strong>{Move[yourMove]}</strong>
          </p>

          <div>
            <MoveBadge move={yourMove} />`
          </div>
          <p>{message}</p>
        </div>
      </GameLayout>
    );
  }
}
