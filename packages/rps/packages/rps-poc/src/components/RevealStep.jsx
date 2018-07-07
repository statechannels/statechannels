import React from 'react';

import { PLAY_OPTIONS } from '../constants';

export default class RevealStep extends React.PureComponent {
  render() {
    const { selectedMoveId, opponentMoveId } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>The result:</h1>
        </div>
        <div style={{ width: '100%' }}>
          You chose {PLAY_OPTIONS.find(option => option.id === selectedMoveId).name}
        </div>
        <div style={{ width: '100%' }}>
          Your opponent chose {PLAY_OPTIONS.find(option => option.id === opponentMoveId).name}
        </div>
      </div>
    );
  }
}
