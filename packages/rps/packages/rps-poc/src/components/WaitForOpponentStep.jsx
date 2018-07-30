import React from 'react';
import PropTypes from 'prop-types';

import { PLAY_OPTIONS } from '../constants';

const propTypes = {
  selectedPlayId: PropTypes.number.isRequired,
};

export default class WaitForOpponentStep extends React.PureComponent {
  render() {
    const { selectedPlayId } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>Waiting for opponent...</h1>
        </div>
        {selectedPlayId && (
          <div style={{ width: '100%' }}>
            You&apos;ve chosen {PLAY_OPTIONS.find(option => option.id === selectedPlayId).name}
          </div>
        )}
      </div>
    );
  }
}

WaitForOpponentStep.propTypes = propTypes;
