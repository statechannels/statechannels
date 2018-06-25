import React from 'react';

import { MOVE_OPTIONS } from '../constants';

export default class WaitForOpponent extends React.PureComponent {
  render() {
    const { selectedMoveId } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>Waiting for opponent...</h1>
        </div>
        <div style={{ width: '100%' }}>
          You've chosen {MOVE_OPTIONS.find(option => option.id === selectedMoveId).name}
        </div>
      </div>
    );
  }
}
