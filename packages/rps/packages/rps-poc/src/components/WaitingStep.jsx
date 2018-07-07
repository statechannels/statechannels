import React from 'react';

import { PLAY_OPTIONS } from '../constants';

export default class WaitingStep extends React.PureComponent {
  render() {
    const { selectedPlayId, forChain } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>Waiting for {forChain ? 'opponent' : 'blockchain to update'}...</h1>
        </div>
        {selectedPlayId && (
          <div style={{ width: '100%' }}>
            You've chosen {PLAY_OPTIONS.find(option => option.id === selectedPlayId).name}
          </div>
        )}
      </div>
    );
  }
}
