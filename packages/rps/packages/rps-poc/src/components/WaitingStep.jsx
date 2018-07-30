import React from 'react';
import PropTypes from 'prop-types';

import { PLAY_OPTIONS } from '../constants';

const propTypes = {
  message: PropTypes.string.isRequired,
  selectedPlayId: PropTypes.number,
};

const defaultProps = {
  selectedPlayId: null,
};

export default class WaitingStep extends React.PureComponent {
  render() {
    const { message, selectedPlayId } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>Waiting for { message }...</h1>
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

WaitingStep.propTypes = propTypes;
WaitingStep.defaultProps = defaultProps;
