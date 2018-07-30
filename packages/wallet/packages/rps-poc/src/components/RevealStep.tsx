import * as React from 'react';

import { PLAY_OPTIONS } from '../constants';

interface IProps {
  selectedMoveId: number,
  opponentMoveId: number,
};

export default class RevealStep extends React.PureComponent<IProps> {
  render() {
    const { selectedMoveId, opponentMoveId } = this.props;

    const yourPlay = PLAY_OPTIONS.find(option => option.id === selectedMoveId);
    const theirPlay = PLAY_OPTIONS.find(option => option.id === opponentMoveId);

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>The result:</h1>
        </div>
        <div style={{ width: '100%' }}>
          You chose {yourPlay && yourPlay.name}
        </div>
        <div style={{ width: '100%' }}>
          Your opponent chose {theirPlay && theirPlay.name}
        </div>
      </div>
    );
  }
}
